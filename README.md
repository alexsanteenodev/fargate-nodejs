# Fargate-nodejs

[![npm version](https://img.shields.io/npm/v/fargate-nodejs.svg)](https://www.npmjs.com/package/fargate-nodejs)
[![GitHub](https://img.shields.io/badge/GitHub-alexsanteenodev%2Ffargate--nodejs-blue?logo=github)](https://github.com/alexsanteenodev/fargate-nodejs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Deploy Node.js/TypeScript to AWS Fargate with automatic esbuild bundling, similar to [Lambda's `NodejsFunction`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.NodejsFunction.html).

## Features

- Automatic code bundling with esbuild (no Docker knowledge required)
- TypeScript and JavaScript support
- Works for HTTP services, SQS workers, scheduled tasks, or background jobs
- Optional ALB integration
- Auto-scaling based on CPU, memory, or SQS queue depth
- IAM roles and security groups configured automatically

## Installation

```bash
npm install fargate-nodejs
```

## Quick Start

HTTP service:

```typescript
import { FargateNodejsService } from 'fargate-nodejs';

const service = new FargateNodejsService(stack, 'MyService', {
  entry: './src/index.ts',
  runtime: '18',
  containerPort: 3000,
});
```

SQS worker (no ports needed):

```typescript
const worker = new FargateNodejsService(stack, 'Worker', {
  entry: './src/worker.ts',
  environment: { QUEUE_URL: queue.queueUrl },
  autoScaling: {
    sqsQueue: queue,
    messagesPerTask: 10,
  },
});
```

## Configuration

### With Load Balancer

```typescript
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

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
const service = new FargateNodejsService(stack, 'MyService', {
  entry: './src/index.ts',
  autoScaling: {
    minCapacity: 2,
    maxCapacity: 10,
    targetCpuUtilization: 70,
    // Or for SQS: sqsQueue: queue, messagesPerTask: 5
  },
});
```

### Advanced Configuration

```typescript
const service = new FargateNodejsService(stack, 'MyService', {
  entry: './src/index.ts',
  projectRoot: './my-app',
  cpu: 512,
  memoryLimitMiB: 1024,

  bundling: {
    minify: true,
    sourceMap: true,
    externalModules: ['aws-sdk'],
  },

  environment: { API_KEY: 'value' },
  secrets: { DB_PASSWORD: ecs.Secret.fromSecretsManager(secret) },

  assignPublicIp: false,
  enableExecuteCommand: true,
});

// Grant permissions
service.grantPermissions([...]);
```

## Properties

Key properties:

- `entry` (required) - Path to entry file
- `runtime` - Node.js version (14, 16, 18, 20, 22)
- `containerPort` - Port to expose (omit for workers)
- `cpu` / `memoryLimitMiB` - Resource limits
- `bundling` - esbuild options (minify, sourceMap, externalModules)
- `autoScaling` - CPU/memory/SQS-based scaling
- `loadBalancer` - ALB integration
- `environment` / `secrets` - Container config

See [types.ts](https://github.com/alexsanteenodev/fargate-nodejs/blob/main/lib/types.ts) for full API.

## Why use this?

**vs Lambda:** No 15-minute timeout, no cold starts, better for long-running workloads, WebSockets, or anything that needs persistent connections.

**vs raw Fargate:** No Docker expertise needed, automatic bundling, cleaner CDK code.

## Examples

- [Basic HTTP Service](https://github.com/alexsanteenodev/fargate-nodejs/tree/main/examples/basic) - Express app
- [SQS Worker](https://github.com/alexsanteenodev/fargate-nodejs/tree/main/examples/sqs-worker) - Background worker with queue scaling

## Development

```bash
npm install
npm run build
npm test
```

## License

[MIT](https://github.com/alexsanteenodev/fargate-nodejs/blob/main/LICENSE)
