import * as cdk from 'aws-cdk-lib';
import { FargateNodejsService } from 'fargate-nodejs';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'TestStack');

new FargateNodejsService(stack, 'Service', {
  entry: './handler.ts',
  runtime: '20',
});
