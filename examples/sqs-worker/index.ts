#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { FargateNodejsService } from 'fargate-nodejs';

const app = new cdk.App();

class SqsWorkerExampleStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const queue = new sqs.Queue(this, 'WorkQueue', {
      queueName: 'fargate-worker-queue',
      visibilityTimeout: cdk.Duration.seconds(30),
      retentionPeriod: cdk.Duration.days(4),
    });

    const worker = new FargateNodejsService(this, 'SqsWorker', {
      entry: './app/index.ts',
      runtime: '18',
      cpu: 256,
      memoryLimitMiB: 512,
      // Environment variables
      environment: {
        QUEUE_URL: queue.queueUrl,
        NODE_ENV: 'production',
      },

      // Scale up/down based on queue depth
      autoScaling: {
        minCapacity: 1,
        maxCapacity: 10,
        sqsQueue: queue,
        messagesPerTask: 10, // Scale up when queue has 10+ messages per task
      },

      // Run in private subnet (no public IP needed)
      assignPublicIp: false,
    });

    // Grant permissions to read/delete from queue
    queue.grantConsumeMessages(worker.taskDefinition.taskRole);

    // Outputs
    new cdk.CfnOutput(this, 'QueueUrl', {
      value: queue.queueUrl,
      description: 'SQS Queue URL',
    });

    new cdk.CfnOutput(this, 'QueueName', {
      value: queue.queueName,
      description: 'SQS Queue Name',
    });

    new cdk.CfnOutput(this, 'ServiceArn', {
      value: worker.service.serviceArn,
      description: 'Fargate Service ARN',
    });

    new cdk.CfnOutput(this, 'ClusterName', {
      value: worker.cluster.clusterName,
      description: 'ECS Cluster Name',
    });
  }
}

new SqsWorkerExampleStack(app, 'SqsWorkerExampleStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
