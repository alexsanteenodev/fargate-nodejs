# fargate-nodejs

A CDK construct for deploying Node.js/TypeScript applications to AWS Fargate, similar to AWS Lambda's `NodejsFunction`. This library automatically bundles your TypeScript/JavaScript code using esbuild, creates a Docker image, and deploys it as a long-running service to ECS Fargate.

## Features

- 🚀 **Automatic bundling** with esbuild (similar to Lambda's NodejsFunction)
- 📦 **TypeScript support** out of the box
- 🐳 **Docker image creation** and ECR deployment handled automatically
- ⚡ **Fast builds** with esbuild's performance
- 🔧 **Configurable** CPU, memory, environment variables, and more
- 🌐 **Load balancer integration** with ALB support
- 📈 **Auto-scaling** based on CPU and memory utilization
- 🔐 **IAM roles** and security groups configured automatically

## Installation

```bash
npm install fargate-nodejs
```

## Usage

### Basic Example

```typescript
import * as cdk from 'aws-cdk-lib';
import { FargateNodejsService } from 'fargate-nodejs';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'MyStack');

// Create a Fargate service running your Node.js application
const service = new FargateNodejsService(stack, 'MyService', {
  entry: './src/index.ts', // Path to your entry file
  runtime: '18', // Node.js version
  cpu: 256, // .25 vCPU
  memoryLimitMiB: 512, // 512 MB RAM
  containerPort: 3000,
  environment: {
    NODE_ENV: 'production',
  },
});
```

### With Load Balancer

```typescript
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

const alb = new elbv2.ApplicationLoadBalancer(stack, 'ALB', {
  vpc,
  internetFacing: true,
});

const service = new FargateNodejsService(stack, 'MyService', {
  entry: './src/index.ts',
  loadBalancer: {
    loadBalancer: alb,
    pathPatterns: ['/api/*'],
    healthCheckPath: '/health',
  },
});
```

### With Auto Scaling

```typescript
const fn = new FargateNodejsService(stack, 'MyFunction', {
  entry: './src/index.ts',
  autoScaling: {
    minCapacity: 2,
    maxCapacity: 10,
    targetCpuUtilization: 70,
    targetMemoryUtilization: 80,
  },
});
```

### Advanced Configuration

```typescript
const fn = new FargateNodejsService(stack, 'MyFunction', {
  entry: './src/index.ts',
  handler: 'handler', // Export name in your entry file
  projectRoot: './my-app', // Project root directory
  
  // Bundling options
  bundling: {
    minify: true,
    sourceMap: true,
    target: 'node18',
    externalModules: ['aws-sdk'],
    esbuildOptions: {
      define: {
        'process.env.DEBUG': 'false',
      },
    },
  },
  
  // Fargate configuration
  vpc,
  cpu: 512,
  memoryLimitMiB: 1024,
  desiredCount: 2,
  
  // Networking
  assignPublicIp: false,
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
  
  // Environment and secrets
  environment: {
    API_KEY: 'my-api-key',
  },
  secrets: {
    DB_PASSWORD: ecs.Secret.fromSecretsManager(secret),
  },
  
  // Enable ECS Exec for debugging
  enableExecuteCommand: true,
});

// Add additional permissions
service.grantPermissions([
  new iam.PolicyStatement({
    actions: ['s3:GetObject'],
    resources: ['arn:aws:s3:::my-bucket/*'],
  }),
]);
```

## API Reference

### FargateNodejsServiceProps

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `entry` | `string` | **Required** | Path to the entry file (JavaScript or TypeScript) |
| `handler` | `string` | `'handler'` | The name of the exported handler function |
| `runtime` | `'14' \| '16' \| '18' \| '20' \| '22'` | `'18'` | Node.js runtime version |
| `cpu` | `number` | `256` | CPU units (.25 vCPU = 256) |
| `memoryLimitMiB` | `number` | `512` | Memory in MiB |
| `containerPort` | `number` | `3000` | Port the container listens on |
| `desiredCount` | `number` | `1` | Number of tasks to run |
| `environment` | `Record<string, string>` | `{}` | Environment variables |
| `bundling` | `BundlingOptions` | See below | Bundling configuration |
| `vpc` | `IVpc` | New VPC | VPC to deploy in |
| `assignPublicIp` | `boolean` | `false` | Whether to assign public IP |
| `autoScaling` | `AutoScalingConfig` | - | Auto scaling configuration |
| `loadBalancer` | `LoadBalancerConfig` | - | Load balancer configuration |

### BundlingOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `minify` | `boolean` | `true` | Minify the bundled code |
| `sourceMap` | `boolean` | `false` | Include source maps |
| `target` | `string` | `'node18'` | esbuild target |
| `externalModules` | `string[]` | `[]` | Modules to exclude from bundle |
| `format` | `'cjs' \| 'esm'` | `'cjs'` | Output format |

## Comparison with Lambda NodejsFunction

| Feature | Lambda NodejsFunction | FargateNodejsService |
|---------|----------------------|----------------------|
| Automatic bundling | ✅ | ✅ |
| TypeScript support | ✅ | ✅ |
| Cold starts | Yes (can be significant) | No |
| Execution time limit | 15 minutes max | Unlimited |
| Memory limit | 10 GB max | Up to 120 GB |
| Pricing model | Pay per invocation | Pay for running time |
| Long-running processes | ❌ | ✅ |
| WebSockets | Limited | ✅ |
| VPC required | No | Yes |

## Examples

See the [examples/](examples/) directory for complete working examples:

- [Basic](examples/basic/) - Simple Express application
- More examples coming soon!

## Development

### Install dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

### Run tests

```bash
npm test
```

### Lint

```bash
npm run eslint
```

### Format

```bash
npm run format
```

## Publishing

### Version bump and publish

```bash
# Patch version (1.0.0 -> 1.0.1)
npm run commit:patch

# Minor version (1.0.0 -> 1.1.0)
npm run commit:minor

# Major version (1.0.0 -> 2.0.0)
npm run commit:major

# Then publish
npm run release:publish
```

## License

MIT
