import * as path from 'path';

import * as cdk from 'aws-cdk-lib';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

import { Bundler } from './bundling';
import { FargateNodejsServiceProps } from './types';

/**
 * A Fargate service that runs Node.js/TypeScript code, similar to Lambda's NodejsFunction
 */
export class FargateNodejsService extends Construct {
  /**
   * The Fargate service
   */
  public readonly service: ecs.FargateService;

  /**
   * The task definition
   */
  public readonly taskDefinition: ecs.FargateTaskDefinition;

  /**
   * The container definition
   */
  public readonly container: ecs.ContainerDefinition;

  /**
   * The VPC
   */
  public readonly vpc: ec2.IVpc;

  /**
   * The ECS cluster
   */
  public readonly cluster: ecs.ICluster;

  /**
   * The security group
   */
  public readonly securityGroup: ec2.ISecurityGroup;

  /**
   * The target group (if load balancer is configured)
   */
  public targetGroup?: elbv2.ApplicationTargetGroup;

  constructor(scope: Construct, id: string, props: FargateNodejsServiceProps) {
    super(scope, id);

    // Validate entry point
    if (!props.entry) {
      throw new Error('entry is required');
    }

    // Determine paths
    const entryPath = path.resolve(props.entry);
    const projectRoot = props.projectRoot || Bundler.findProjectRoot(path.dirname(entryPath));
    const runtime = props.runtime || '18';
    // Only set default port if loadBalancer is configured, otherwise leave undefined
    const containerPort = props.containerPort || (props.loadBalancer ? 3000 : undefined);

    // Bundle the code with esbuild (similar to Lambda's NodejsFunction)
    const bundler = new Bundler({
      entry: entryPath,
      projectRoot,
      runtime,
      minify: props.bundling?.minify,
      sourceMap: props.bundling?.sourceMap,
      externalModules: props.bundling?.externalModules,
    });

    // Bundle outputs to a staging directory
    const bundleDir = bundler.bundle();

    // Get or create VPC
    this.vpc =
      props.vpc ||
      new ec2.Vpc(this, 'Vpc', {
        maxAzs: 2,
        natGateways: props.assignPublicIp ? 0 : 1,
      });

    // Get or create cluster
    this.cluster =
      props.cluster ||
      new ecs.Cluster(this, 'Cluster', {
        vpc: this.vpc,
      });

    // Create task definition
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: props.cpu || 256,
      memoryLimitMiB: props.memoryLimitMiB || 512,
      executionRole: props.executionRole,
      taskRole: props.taskRole,
      runtimePlatform: {
        cpuArchitecture: props.architecture || ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });

    // Create log group
    const logGroup =
      props.logGroup ||
      new logs.LogGroup(this, 'LogGroup', {
        retention: props.logRetention || logs.RetentionDays.ONE_WEEK,
        removalPolicy: RemovalPolicy.DESTROY,
      });

    // Build Docker image with bundled code
    // Use the bundled directory as context and a simple Dockerfile
    const image = ecs.ContainerImage.fromAsset(bundleDir, {
      platform:
        props.architecture === ecs.CpuArchitecture.ARM64
          ? ecr_assets.Platform.LINUX_ARM64
          : ecr_assets.Platform.LINUX_AMD64,
      buildArgs: {
        NODE_VERSION: runtime,
        ...props.buildArgs,
      },
      // Dockerfile is copied to root of bundle directory
    });

    // Create container definition
    this.container = this.taskDefinition.addContainer('app', {
      image,
      logging: ecs.LogDriver.awsLogs({
        logGroup,
        streamPrefix: 'fargate-nodejs',
      }),
      environment: props.environment,
      secrets: props.secrets,
      workingDirectory: '/app',
    });

    // Add port mapping only if containerPort is specified (for HTTP services)
    // Not needed for SQS workers, scheduled tasks, or background jobs
    if (containerPort !== undefined) {
      this.container.addPortMappings({
        containerPort,
        protocol: ecs.Protocol.TCP,
      });
    }

    // Note: Health checks should be configured at the ECS service level or via ALB
    // Container-level health checks are not directly supported in CDK

    // Create security group
    const securityGroups = props.securityGroups || [
      new ec2.SecurityGroup(this, 'SecurityGroup', {
        vpc: this.vpc,
        description: `Security group for ${id}`,
        allowAllOutbound: true,
      }),
    ];
    this.securityGroup = securityGroups[0];

    // Allow inbound traffic on container port (only if port is specified)
    if (containerPort !== undefined && this.securityGroup instanceof ec2.SecurityGroup) {
      this.securityGroup.addIngressRule(
        ec2.Peer.anyIpv4(),
        ec2.Port.tcp(containerPort),
        'Allow inbound traffic on container port'
      );
    }

    // Create Fargate service
    this.service = new ecs.FargateService(this, 'Service', {
      cluster: this.cluster,
      taskDefinition: this.taskDefinition,
      desiredCount: props.desiredCount || 1,
      serviceName: props.serviceName,
      assignPublicIp: props.assignPublicIp || false,
      securityGroups,
      vpcSubnets: props.vpcSubnets || {
        subnetType: props.assignPublicIp
          ? ec2.SubnetType.PUBLIC
          : ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      enableExecuteCommand: props.enableExecuteCommand || false,
      minHealthyPercent: props.minHealthyPercent || 100,
      maxHealthyPercent: props.maxHealthyPercent || 200,
    });

    // Configure load balancer if specified
    if (props.loadBalancer) {
      if (containerPort === undefined) {
        throw new Error('containerPort must be specified when loadBalancer is configured');
      }
      this.configureLoadBalancer(props, containerPort);
    }

    // Configure auto scaling if specified
    if (props.autoScaling) {
      this.configureAutoScaling(props);
    }
  }

  /**
   * Configure load balancer
   */
  private configureLoadBalancer(props: FargateNodejsServiceProps, containerPort: number): void {
    if (!props.loadBalancer) return;

    const lbConfig = props.loadBalancer;

    // Get or create listener
    const listener =
      lbConfig.listener ||
      lbConfig.loadBalancer.addListener('Listener', {
        port: 80,
        protocol: elbv2.ApplicationProtocol.HTTP,
      });

    // Create target group
    this.targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc: this.vpc,
      port: containerPort,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetType: elbv2.TargetType.IP,
      healthCheck: {
        path: lbConfig.healthCheckPath || '/health',
        interval: lbConfig.healthCheckInterval || Duration.seconds(30),
      },
      deregistrationDelay: lbConfig.deregistrationDelay || Duration.seconds(30),
    });

    // Attach service to target group
    this.service.attachToApplicationTargetGroup(this.targetGroup);

    // Add listener rule
    const ruleProps: elbv2.ApplicationListenerRuleProps = {
      listener,
      conditions: [
        ...(lbConfig.pathPatterns
          ? [elbv2.ListenerCondition.pathPatterns(lbConfig.pathPatterns)]
          : []),
        ...(lbConfig.hostHeaders
          ? [elbv2.ListenerCondition.hostHeaders(lbConfig.hostHeaders)]
          : []),
      ],
      targetGroups: [this.targetGroup],
    };
    if (lbConfig.priority !== undefined) {
      ruleProps.priority = lbConfig.priority;
    }
    new elbv2.ApplicationListenerRule(this, 'ListenerRule', ruleProps);
  }

  /**
   * Configure auto scaling
   */
  private configureAutoScaling(props: FargateNodejsServiceProps): void {
    if (!props.autoScaling) return;

    const autoScalingConfig = props.autoScaling;

    const scaling = this.service.autoScaleTaskCount({
      minCapacity: autoScalingConfig.minCapacity || 1,
      maxCapacity: autoScalingConfig.maxCapacity || 10,
    });

    // CPU-based scaling
    if (autoScalingConfig.targetCpuUtilization) {
      scaling.scaleOnCpuUtilization('CpuScaling', {
        targetUtilizationPercent: autoScalingConfig.targetCpuUtilization,
        scaleInCooldown: autoScalingConfig.scaleInCooldown || Duration.seconds(300),
        scaleOutCooldown: autoScalingConfig.scaleOutCooldown || Duration.seconds(60),
      });
    }

    // Memory-based scaling
    if (autoScalingConfig.targetMemoryUtilization) {
      scaling.scaleOnMemoryUtilization('MemoryScaling', {
        targetUtilizationPercent: autoScalingConfig.targetMemoryUtilization,
        scaleInCooldown: autoScalingConfig.scaleInCooldown || Duration.seconds(300),
        scaleOutCooldown: autoScalingConfig.scaleOutCooldown || Duration.seconds(60),
      });
    }

    // SQS queue-based scaling
    if (autoScalingConfig.sqsQueue) {
      const messagesPerTask = autoScalingConfig.messagesPerTask || 5;

      scaling.scaleOnMetric('SqsQueueScaling', {
        metric: autoScalingConfig.sqsQueue.metricApproximateNumberOfMessagesVisible({
          statistic: 'Average',
          period: Duration.minutes(1),
        }),
        scalingSteps: [
          { upper: 0, change: -1 },
          { lower: messagesPerTask, change: +1 },
          { lower: messagesPerTask * 2, change: +2 },
          { lower: messagesPerTask * 4, change: +3 },
        ],
        adjustmentType: cdk.aws_applicationautoscaling.AdjustmentType.CHANGE_IN_CAPACITY,
      });
    }
  }

  /**
   * Grant permissions to the task role
   */
  public grantPermissions(permissions: iam.PolicyStatement[]): void {
    const taskRole = this.taskDefinition.taskRole;
    permissions.forEach((permission) => {
      taskRole.addToPrincipalPolicy(permission);
    });
  }

  /**
   * Add environment variable to the container
   */
  public addEnvironment(key: string, value: string): void {
    this.container.addEnvironment(key, value);
  }

  /**
   * Add secret to the container
   */
  public addSecret(key: string, secret: ecs.Secret): void {
    this.container.addSecret(key, secret);
  }
}
