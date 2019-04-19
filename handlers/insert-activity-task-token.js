import retry from 'async-retry';
import { dynamodb, dynamodbMarshall, dynamodbUnmarshall } from '../lib/aws_clients';

const {
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
} = process.env;

export const handler = async (input, context, callback) => {
  const {
    activity: {
      taskToken,
      executionKey,
    },
    target,
    loop,
  } = input;

  let updatedJobExecution;

  if (taskToken) {
    // retry, because this token is only issued exactly once!
    // TODO: consider proxying this write via sqs or similar
    let attemptsTaken;
    updatedJobExecution = await retry(async (bail, attempt) => {
      attemptsTaken = attempt;
      try {
        const { Attributes: result } = await dynamodb.updateItem({
          TableName: DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
          Key: dynamodbMarshall(executionKey),
          ExpressionAttributeNames: {
            '#TOK': 'callbackTaskToken',
            '#UP': 'updatedAt',
          },
          ExpressionAttributeValues: dynamodbMarshall({
            ':now': parseInt(Date.now() / 1000),
            ':tok': taskToken,
          }),
          UpdateExpression: 'SET #UP = :now, #TOK = :tok',
          ReturnValues: 'ALL_NEW',
          // ConditionExpression: 'attribute_not_exists(#TOK)',
        }).promise();

        return dynamodbUnmarshall(result);
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

    if (updatedJobExecution) {
      console.log('updatedJobExecution: ' + JSON.stringify(updatedJobExecution, null, 2));
    }
  }

  let resp = { loop }

  if (loop) {
    resp.target = target;
  }

  if (updatedJobExecution) {
    resp.jobExecution = updatedJobExecution;
  }

  console.log(`done: (${JSON.stringify(resp, null, 2)})`);

  callback(null, resp);
}
