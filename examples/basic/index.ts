import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { FargateNodejsService } from 'fargate-nodejs';

export class BasicExampleStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const logGroup = new cdk.aws_logs.LogGroup(this, 'MyLogGroup', {
      logGroupName: '/fargate-nodejs-service/logs',
      retention: cdk.aws_logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const containerPort = 8080;

    const fn = new FargateNodejsService(this, 'MyService', {
      entry: './app/index.ts', // Path to your TypeScript/JavaScript entry file
      runtime: '18', // Node.js 18
      cpu: 256, // .25 vCPU
      memoryLimitMiB: 512, // 512 MB
      containerPort,
      desiredCount: 1,
      assignPublicIp: true, // For demo purposes; use false with NAT Gateway in production
      environment: {
        NODE_ENV: 'production',
        PORT: containerPort.toString(),
      },
      bundling: {
        minify: true,
        sourceMap: false,
        externalModules: ['aws-sdk'], // Don't bundle AWS SDK
      },
      logGroup,
    });

    // Output the service ARN
    new cdk.CfnOutput(this, 'ServiceArn', {
      value: fn.service.serviceArn,
      description: 'The ARN of the Fargate service',
    });

    // Output the cluster name
    new cdk.CfnOutput(this, 'ClusterName', {
      value: fn.cluster.clusterName,
      description: 'The name of the ECS cluster',
    });

    // Output the log group name for debugging
    new cdk.CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName,
      description: 'CloudWatch Log Group name - use to view container logs',
    });
  }
}

// Example CDK app
const app = new cdk.App();
new BasicExampleStack(app, 'BasicExampleStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
