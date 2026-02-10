# Fargate-nodejs

[![npm version](https://img.shields.io/npm/v/fargate-nodejs.svg)](https://www.npmjs.com/package/fargate-nodejs)
[![npm downloads](https://img.shields.io/npm/dm/fargate-nodejs.svg)](https://www.npmjs.com/package/fargate-nodejs)
[![npm package size](https://img.shields.io/npm/unpacked-size/fargate-nodejs)](https://www.npmjs.com/package/fargate-nodejs)
[![CI](https://github.com/alexsanteenodev/fargate-nodejs/actions/workflows/ci.yml/badge.svg)](https://github.com/alexsanteenodev/fargate-nodejs/actions/workflows/ci.yml)
[![GitHub](https://img.shields.io/badge/GitHub-alexsanteenodev%2Ffargate--nodejs-blue?logo=github)](https://github.com/alexsanteenodev/fargate-nodejs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Deploy Node.js/TypeScript to AWS Fargate with automatic esbuild bundling, similar to [Lambda's `NodejsFunction`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.NodejsFunction.html).

## Video walkthrough

A hands-on walkthrough showing how `fargate-nodejs` works, why it exists, and how it compares to Lambda and raw Fargate:

👉 https://www.youtube.com/watch?v=LMTDykz6NuI

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
- `runtime` - Node.js version (14, 16, 18, 20, 22, 23)
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

## Contributing

Contributions are welcome! Here's how you can help:

New to contributing? Check out [GitHub's guide to contributing to a project](https://docs.github.com/en/get-started/exploring-projects-on-github/contributing-to-a-project).

### Reporting Issues

- Check if the issue already exists in [GitHub Issues](https://github.com/alexsanteenodev/fargate-nodejs/issues)
- Provide a clear description and reproduction steps
- Include your CDK version, Node.js version, and relevant code snippets

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Run tests: `npm test`
5. Build the project: `npm run build`
6. Commit with a clear message: `git commit -m "feat: add new feature"`
7. Push to your fork: `git push origin feature/my-feature`
8. Open a Pull Request with a description of your changes

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/fargate-nodejs.git
cd fargate-nodejs

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Test locally with examples
cd examples/basic
npm install
npx cdk synth
```

### Code Style

- Follow the existing code style
- Use TypeScript for all code
- Keep commits atomic and well-described

### Testing

- Add unit tests for new features
- Ensure all tests pass before submitting
- Test with the example projects when possible

## License

[MIT](https://github.com/alexsanteenodev/fargate-nodejs/blob/main/LICENSE)
