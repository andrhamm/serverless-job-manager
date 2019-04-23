import { Consumer } from 'sqs-consumer';
import { lambda, sqs } from '../lib/aws_clients';

const {
  SQS_QUEUE_URL_JOB_EXECUTION_EVENTS,
  LAMBDA_ARN_START_EXECUTION_WITH_EVENT,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    sqs: {
      messageGroupId: sqsMessageGroupId,
      message: {
        MessageId: sqsMessageId
      },
    },
  } = input;

  let targetMessageProcessed = false;

  await new Promise((resolve, reject) => {
    const sqsConsumer = Consumer.create({
      sqs,
      queueUrl: SQS_QUEUE_URL_JOB_EXECUTION_EVENTS,
      attributeNames: ['All'],
      batchSize: 10, // 10 is the max, processes messages in parallel
      visibilityTimeout: 10, // seconds
      terminateVisibilityTimeout: true,
      handleMessageTimeout: 2000, // milliseconds
      handleMessage: async (message) => {
        console.log(`handleMessage received message: ` + JSON.stringify(message, null, 2));

        const {
          Body: executionEventJson,
          MessageId: thisSqsMessageId,
          Attributes: {
            MessageGroupId: thisSqsMessageGroupId,
          }
        } = message;

        const isTargetMessage = thisSqsMessageId === sqsMessageId;
        const isTargetMessageGroup = thisSqsMessageGroupId === sqsMessageGroupId;

        if (!isTargetMessage && !isTargetMessageGroup) {
          throw new Error('Message is from a different message group, returning it to the queue');
        }

        const lambdaResp = await lambda.invoke({
          FunctionName: LAMBDA_ARN_START_EXECUTION_WITH_EVENT,
          InvocationType: 'Event', // async / fire and forget
          Payload: executionEventJson,
        }).promise();

        console.log(`lambdaResp: ` + JSON.stringify(lambdaResp, null, 2));

        if (isTargetMessage) {
          sqsConsumer.stop();

          targetMessageProcessed = true;
        }
      },
    });

    // sqsConsumer.on('message_processed', (message) => {
    //   console.log(`message_processed: ` + JSON.stringify(message, null, 2));
    // });

    sqsConsumer.on('error', (err) => {
      console.error(`error: ${err.message}`);
    });

    sqsConsumer.on('processing_error', (err) => {
      // Fired when an error occurs processing the message.
      console.error(`processing_error: ${err.message}`);
    });

    sqsConsumer.on('timeout_error', (err) => {
      // Fired when handleMessageTimeout is supplied as an option and if handleMessage times out.
     console.error(`timeout_error: ${err.message}`);
    });

    sqsConsumer.on('empty', () => {
      console.log('queue empty at ' + Date.now());
      resolve();
    });

    sqsConsumer.on('stopped', () => {
      console.log('consumer stopped at ' + Date.now());
      resolve();
    });

    sqsConsumer.start();
  });
};
