import { BuildOptions } from 'esbuild';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration } from 'aws-cdk-lib';

/**
 * Command hooks for the bundling process
 */
export interface ICommandHooks {
  /**
   * Commands to run before bundling
   */
  beforeBundling?(inputDir: string, outputDir: string): string[];

  /**
   * Commands to run after bundling
   */
  afterBundling?(inputDir: string, outputDir: string): string[];

  /**
   * Commands to run before installing node modules
   */
  beforeInstall?(inputDir: string, outputDir: string): string[];
}

/**
 * Bundling options for the Node.js function
 */
export interface BundlingOptions {
  /**
   * Whether to minify the output
   * @default true
   */
  readonly minify?: boolean;

  /**
   * Whether to include source maps
   * @default false
   */
  readonly sourceMap?: boolean;

  /**
   * Target environment for the build
   * @default 'node18'
   */
  readonly target?: string;

  /**
   * External modules that should not be bundled
   * @default []
   */
  readonly externalModules?: string[];

  /**
   * Modules that should be installed in the Docker image
   * @default - All production dependencies from package.json
   */
  readonly nodeModules?: string[];

  /**
   * Command hooks to run during bundling
   * @default - No hooks
   */
  readonly commandHooks?: ICommandHooks;

  /**
   * Additional esbuild options
   * @default - No additional options
   */
  readonly esbuildOptions?: Partial<BuildOptions>;

  /**
   * Whether to bundle all dependencies into the output
   * @default true
   */
  readonly bundleAll?: boolean;

  /**
   * The Docker image to use for bundling
   * @default - Uses the default Node.js Docker image
   */
  readonly dockerImage?: string;

  /**
   * Charset for esbuild
   * @default 'utf8'
   */
  readonly charset?: 'ascii' | 'utf8';

  /**
   * Output format
   * @default 'cjs'
   */
  readonly format?: 'cjs' | 'esm';

  /**
   * Whether to keep names in the bundled code
   * @default false
   */
  readonly keepNames?: boolean;

  /**
   * Log level for bundling
   * @default 'warning'
   */
  readonly logLevel?: 'verbose' | 'debug' | 'info' | 'warning' | 'error' | 'silent';
}

/**
 * Container health check configuration
 */
export interface HealthCheckConfig {
  /**
   * The command to run for health check
   * @default ['CMD-SHELL', 'exit 0']
   */
  readonly command?: string[];

  /**
   * Time period between health checks
   * @default Duration.seconds(30)
   */
  readonly interval?: Duration;

  /**
   * How long to wait for health check to succeed
   * @default Duration.seconds(5)
   */
  readonly timeout?: Duration;

  /**
   * Number of retries before marking unhealthy
   * @default 3
   */
  readonly retries?: number;

  /**
   * Grace period before starting health checks
   * @default Duration.seconds(0)
   */
  readonly startPeriod?: Duration;
}

/**
 * Auto scaling configuration
 */
export interface AutoScalingConfig {
  /**
   * Minimum number of tasks
   * @default 1
   */
  readonly minCapacity?: number;

  /**
   * Maximum number of tasks
   * @default 10
   */
  readonly maxCapacity?: number;

  /**
   * Target CPU utilization percentage
   * @default 70
   */
  readonly targetCpuUtilization?: number;

  /**
   * Target memory utilization percentage
   * @default 70
   */
  readonly targetMemoryUtilization?: number;

  /**
   * Scale in cooldown period
   * @default Duration.seconds(300)
   */
  readonly scaleInCooldown?: Duration;

  /**
   * Scale out cooldown period
   * @default Duration.seconds(60)
   */
  readonly scaleOutCooldown?: Duration;
}

/**
 * Load balancer configuration
 */
export interface LoadBalancerConfig {
  /**
   * The application load balancer to use
   */
  readonly loadBalancer: elbv2.IApplicationLoadBalancer;

  /**
   * The listener to attach the target group to
   * @default - Creates a new listener on port 80
   */
  readonly listener?: elbv2.IApplicationListener;

  /**
   * The priority for the listener rule
   * @default - Automatically assigned
   */
  readonly priority?: number;

  /**
   * Path patterns for routing
   * @default ['/']
   */
  readonly pathPatterns?: string[];

  /**
   * Host headers for routing
   * @default - No host header condition
   */
  readonly hostHeaders?: string[];

  /**
   * Health check path
   * @default '/health'
   */
  readonly healthCheckPath?: string;

  /**
   * Health check interval
   * @default Duration.seconds(30)
   */
  readonly healthCheckInterval?: Duration;

  /**
   * Deregistration delay
   * @default Duration.seconds(30)
   */
  readonly deregistrationDelay?: Duration;
}

/**
 * Properties for defining a FargateNodejsService
 */
export interface FargateNodejsServiceProps {
  /**
   * Path to the entry file (JavaScript or TypeScript)
   */
  readonly entry: string;

  /**
   * The name of the exported handler function
   * @default 'handler'
   */
  readonly handler?: string;

  /**
   * The root directory of the project
   * @default - Automatically detected
   */
  readonly projectRoot?: string;

  /**
   * Path to the lock file (package-lock.json, yarn.lock, or pnpm-lock.yaml)
   * @default - Automatically detected
   */
  readonly depsLockFilePath?: string;

  /**
   * Bundling options
   * @default - Default bundling options
   */
  readonly bundling?: BundlingOptions;

  /**
   * The VPC where the Fargate service will be deployed
   * @default - A new VPC will be created
   */
  readonly vpc?: ec2.IVpc;

  /**
   * The ECS cluster to use
   * @default - A new cluster will be created
   */
  readonly cluster?: ecs.ICluster;

  /**
   * The amount of CPU to allocate to the task
   * @default 256 (.25 vCPU)
   */
  readonly cpu?: number;

  /**
   * The amount of memory (in MiB) to allocate to the task
   * @default 512
   */
  readonly memoryLimitMiB?: number;

  /**
   * Environment variables to pass to the container
   * @default - No environment variables
   */
  readonly environment?: { [key: string]: string };

  /**
   * Secrets to pass to the container
   * @default - No secrets
   */
  readonly secrets?: { [key: string]: ecs.Secret };

  /**
   * The port the container listens on
   * @default 3000
   */
  readonly containerPort?: number;

  /**
   * Health check configuration
   * @default - Default health check
   */
  readonly healthCheck?: HealthCheckConfig;

  /**
   * The minimum healthy percentage for the service   
   * @default 100
   */
  readonly minHealthyPercent?: number;

  /**
   * The maximum healthy percentage for the service
   * @default 200
   */
  readonly maxHealthyPercent?: number;

  /**
   * The desired number of instantiations of the task definition
   * @default 1
   */
  readonly desiredCount?: number;

  /**
   * The name of the service
   * @default - CloudFormation-generated name
   */
  readonly serviceName?: string;

  /**
   * Whether to assign a public IP address
   * @default false
   */
  readonly assignPublicIp?: boolean;

  /**
   * Security groups to associate with the service
   * @default - A new security group is created
   */
  readonly securityGroups?: ec2.ISecurityGroup[];

  /**
   * Subnets to place the service in
   * @default - Private subnets
   */
  readonly vpcSubnets?: ec2.SubnetSelection;

  /**
   * Task execution role
   * @default - A new role is created
   */
  readonly executionRole?: iam.IRole;

  /**
   * Task role
   * @default - A new role is created
   */
  readonly taskRole?: iam.IRole;

  /**
   * CloudWatch log group
   * @default - A new log group is created
   */
  readonly logGroup?: logs.ILogGroup;

  /**
   * Log retention period
   * @default logs.RetentionDays.ONE_WEEK
   */
  readonly logRetention?: logs.RetentionDays;

  /**
   * Enable ECS Exec for debugging
   * @default false
   */
  readonly enableExecuteCommand?: boolean;

  /**
   * Auto scaling configuration
   * @default - No auto scaling
   */
  readonly autoScaling?: AutoScalingConfig;

  /**
   * Load balancer configuration
   * @default - No load balancer
   */
  readonly loadBalancer?: LoadBalancerConfig;

  /**
   * The Node.js runtime version to use
   * @default '18'
   */
  readonly runtime?: '14' | '16' | '18' | '20' | '22';

  /**
   * The platform architecture
   * @default ecs.CpuArchitecture.X86_64
   */
  readonly architecture?: ecs.CpuArchitecture;

  /**
   * Working directory in the container
   * @default '/app'
   */
  readonly workingDirectory?: string;

  /**
   * Docker build arguments
   * @default - No build arguments
   */
  readonly buildArgs?: { [key: string]: string };
}
