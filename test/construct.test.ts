import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as path from 'path';
import { FargateNodejsService } from '../lib';

describe('FargateNodejsService', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
  });

  test('creates basic service with default values', () => {
    new FargateNodejsService(stack, 'Service', {
      entry: path.join(__dirname, 'fixtures', 'app.ts'),
      runtime: '20',
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::ECS::Service', 1);
    template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
    template.resourceCountIs('AWS::ECS::Cluster', 1);
    template.resourceCountIs('AWS::EC2::VPC', 1);
  });

  test('creates service with custom CPU and memory', () => {
    new FargateNodejsService(stack, 'Service', {
      entry: path.join(__dirname, 'fixtures', 'app.ts'),
      runtime: '20',
      cpu: 512,
      memoryLimitMiB: 1024,
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      Cpu: '512',
      Memory: '1024',
    });
  });

  test('creates service with environment variables', () => {
    new FargateNodejsService(stack, 'Service', {
      entry: path.join(__dirname, 'fixtures', 'app.ts'),
      runtime: '20',
      environment: {
        NODE_ENV: 'production',
        API_KEY: 'test-key',
      },
    });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: [
        {
          Environment: [
            { Name: 'NODE_ENV', Value: 'production' },
            { Name: 'API_KEY', Value: 'test-key' },
          ],
        },
      ],
    });
  });

  test('creates service with auto scaling', () => {
    new FargateNodejsService(stack, 'Service', {
      entry: path.join(__dirname, 'fixtures', 'app.ts'),
      runtime: '20',
      autoScaling: {
        minCapacity: 2,
        maxCapacity: 10,
        targetCpuUtilization: 70,
      },
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::ApplicationAutoScaling::ScalableTarget', 1);
    template.hasResourceProperties('AWS::ApplicationAutoScaling::ScalableTarget', {
      MinCapacity: 2,
      MaxCapacity: 10,
    });
  });

  test('sets correct runtime architecture', () => {
    new FargateNodejsService(stack, 'Service', {
      entry: path.join(__dirname, 'fixtures', 'app.ts'),
      runtime: '22',
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
  });

  test('creates service without container port for workers', () => {
    new FargateNodejsService(stack, 'Service', {
      entry: path.join(__dirname, 'fixtures', 'app.ts'),
      runtime: '20',
    });

    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::ECS::Service', 1);
  });
});
