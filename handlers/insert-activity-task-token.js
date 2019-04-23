import retry from 'async-retry';
import { dynamodb, dynamodbMarshall, dynamodbUnmarshall } from '../lib/aws_clients';

const {
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
} = process.env;

export const handler = async (input, context, callback) => {
  const {
    awaitCallbackActivity: {
      taskToken,
      jobExecutionKey,
    }
  } = input;

  let updatedJobExecution;

  if (taskToken) {
    // retry, because this token is only issued exactly once!
    // TODO: consider proxying this write via sqs or similar
    let attemptsTaken;
    await retry(async (bail, attempt) => {
      attemptsTaken = attempt;
      try {
        const { Attributes: result } = await dynamodb.updateItem({
          TableName: DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
          Key: dynamodbMarshall(jobExecutionKey),
          ExpressionAttributeNames: {
            '#TOK': 'awaitCallbackTaskToken',
            '#UP': 'updatedAt',
          },
          ExpressionAttributeValues: dynamodbMarshall({
            ':now': parseInt(Date.now() / 1000),
            ':tok': taskToken,
          }),
          UpdateExpression: 'SET #UP = :now, #TOK = :tok',
          // ConditionExpression: 'attribute_not_exists(#TOK)',
        }).promise();
      } catch (err) {
        // if (err.code && err.code === 'ConditionalCheckFailedException') {
          // expected exception
        // } else
        if (err.code && err.code === 'ProvisionedThroughputExceededException') {
          // retry
          throw err;
        } else {
          // throw and stop retrying
          bail(err);
        }
      }
    }, {
      retries: 5,
      randomize: true,
    });
  }

  const output = { ...input };

  delete input.awaitCallbackActivity;

  callback(null, output);
}
