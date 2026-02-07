import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const queueUrl = process.env.QUEUE_URL;
if (!queueUrl) {
  throw new Error('QUEUE_URL environment variable is required');
}

const sqs = new SQSClient({});

async function processMessage(messageBody: string) {
  console.log('Processing message:', messageBody);
  // Your business logic here
  const data = JSON.parse(messageBody);
  console.log('Processed data:', data);
}

async function pollMessages() {
  console.log('Starting SQS worker...');
  console.log('Polling queue:', queueUrl);

  while (true) {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20, // Long polling
        VisibilityTimeout: 30,
      });

      const response = await sqs.send(command);

      if (response.Messages && response.Messages.length > 0) {
        console.log(`Received ${response.Messages.length} messages`);

        for (const message of response.Messages) {
          try {
            if (message.Body) {
              await processMessage(message.Body);

              // Delete message after successful processing
              if (message.ReceiptHandle) {
                await sqs.send(new DeleteMessageCommand({
                  QueueUrl: queueUrl,
                  ReceiptHandle: message.ReceiptHandle,
                }));
                console.log('Message deleted successfully');
              }
            }
          } catch (error) {
            console.error('Error processing message:', error);
            // Message will become visible again after visibility timeout
          }
        }
      } else {
        console.log('No messages received, continuing to poll...');
      }
    } catch (error) {
      console.error('Error polling SQS:', error);
      // Wait a bit before retrying on error
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Start the worker
pollMessages().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
