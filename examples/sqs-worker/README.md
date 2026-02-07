# SQS Worker Example

This example demonstrates how to use `FargateNodejsService` to create an SQS worker that processes messages from a queue.

## Key Features

- **No port mapping** - Background worker doesn't need to listen on any port
- **Queue-based auto-scaling** - Automatically scales based on SQS queue depth
- **Long polling** - Efficient message retrieval with 20-second wait time
- **Error handling** - Failed messages become visible again after visibility timeout
- **Private subnet** - No public IP needed, runs in private subnet with NAT gateway

## How it works

1. The worker polls the SQS queue for messages
2. Processes each message
3. Deletes successfully processed messages
4. Failed messages automatically become visible again
5. **Auto-scales based on queue depth**: With `messagesPerTask: 10`, it scales:
   - 0 messages → scale in by 1
   - 10+ messages → scale out by 1
   - 20+ messages → scale out by 2
   - 40+ messages → scale out by 3

## Deploy

```bash
npm install
npm run deploy
```

## Send test messages

After deployment, send a test message to the queue:

```bash
aws sqs send-message \
  --queue-url <QUEUE_URL_FROM_OUTPUT> \
  --message-body '{"task": "process-data", "value": 123}'
```

## Monitor

View logs in CloudWatch:

```bash
aws logs tail /aws/ecs/<CLUSTER_NAME> --follow
```

## Clean up

```bash
npm run destroy
```

## Differences from HTTP Service

Unlike the basic Express example:

- ❌ No `containerPort` specified
- ❌ No load balancer
- ❌ No port mappings
- ❌ No security group ingress rules
- ✅ Just a background worker polling SQS
- ✅ Can scale based on queue metrics (add custom scaling policies)
