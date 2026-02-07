# Basic Example

This example demonstrates how to use `FargateNodejsService` to deploy a simple Node.js Express application to AWS Fargate.

## Structure

- `index.ts` - CDK stack definition
- `app/index.ts` - Express application entry point
- `package.json` - Project dependencies
- `cdk.json` - CDK configuration
- `tsconfig.json` - TypeScript configuration

## Prerequisites

- Node.js 16 or later
- AWS CLI configured with credentials
- AWS CDK CLI installed globally: `npm install -g aws-cdk`

## Setup & Deployment

1. **Install dependencies:**
```bash
npm install
```

2. **Build the CDK app:**
```bash
npm run build
```

3. **Bootstrap CDK (first time only):**
```bash
cdk bootstrap
```
This creates the necessary S3 bucket and other resources for CDK deployments in your AWS account.

4. **View the CloudFormation template:**
```bash
npm run synth
```

5. **Deploy the stack:**
```bash
npm run deploy
```

Or use CDK directly:
```bash
cdk deploy
```

6. **View the outputs:**
After deployment, you'll see outputs including:
   - Service ARN
   - Cluster Name
   - VPC ID

## What Gets Created

The deployment creates:
- ECS Fargate Cluster
- VPC with public/private subnets
- Fargate Task Definition with Node.js 18
- ECS Service running your Express app
- Security Groups
- CloudWatch Log Groups
- IAM Roles (Task Role & Execution Role)

Resources:
- 256 CPU units (.25 vCPU)
- 512 MB memory
- Public IP assignment
- Automatic code bundling with esbuild

## Features Demonstrated

- Basic Fargate service creation
- TypeScript bundling
- Environment variables
- Express HTTP server
- Health check endpoint

## Testing

Since the service is deployed with a public IP, you can find the IP in the AWS Console:
1. Go to ECS > Clusters > Your Cluster > Services > Tasks
2. Click on the running task
3. Find the Public IP
4. Access `http://<PUBLIC_IP>:3000/` and `http://<PUBLIC_IP>:3000/health`

## Useful Commands

- `npm run build` - Compile TypeScript
- `npm run watch` - Watch for changes
- `npm run synth` - Synthesize CloudFormation template
- `npm run diff` - Compare deployed stack with current state
- `npm run deploy` - Deploy to AWS
- `npm run destroy` - Remove all resources

## Clean Up

**⚠️ Important:** This will delete all resources created by the stack.

```bash
npm run destroy
```

Or:
```bash
cdk destroy
```

## Cost Considerations

Running this example will incur AWS charges:
- Fargate: ~$0.012/hour for 0.25 vCPU and 512 MB
- VPC NAT Gateway (if used): ~$0.045/hour
- CloudWatch Logs: Based on ingestion and storage

Estimated cost: ~$10-20/month if left running continuously.
