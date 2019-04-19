import retry from 'async-retry';
import { dynamodb, stepfunctions, dynamodbMarshall, dynamodbUnmarshall } from '../lib/aws_clients';

const {
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
  // DYNAMODB_PARTITION_COUNT_JOB_EXECUTIONS,
  STEP_FUNCTION_ACTIVITY_ARN_AWAIT_CALLBACK,
  POLL_TIMEOUT_SECONDS,
} = process.env;

export const handler = async (input, context, callback) => {
  const startedAt = Date.now();

  let { executionName } = input;

  if (!executionName) {
    executionName = context.awsRequestId;
  }

  console.log(`Polling activity tasks, invoked from ${executionName}`);

  let found = false;
  let polls = 0;

  while (Date.now() - startedAt < POLL_TIMEOUT_SECONDS*1000 && polls < 2) {
    console.log(`Polling (${++polls})...`);

    // Note: this request is a long poll that lasts up to 60 seconds
    const {
      taskToken,
      input: activityInputJSON,
    } = await stepfunctions.getActivityTask({
      activityArn: STEP_FUNCTION_ACTIVITY_ARN_AWAIT_CALLBACK,
      // not strictly necessary, potentially useful to track worker context
      workerName: executionName,
    }).promise();

    // taskToken can be null if no activity was found
    if (taskToken) {
      const activityInput = JSON.parse(activityInputJSON);

      console.log(`Received activity task with input: ${JSON.stringify(activityInput)}`);

      const {
        executionKey,
        executionName: activityExecutionName
      } = activityInput;

      found = activityExecutionName && activityExecutionName === executionName;

      if (found) {
        console.log(`Received taskToken for the invoking execution`);
      }

      // retry, because this token is only issued exactly once!
      // TODO: consider proxying this write via sqs or similar
      let attemptsTaken;
      let result = await retry(async (bail, attempt) => {
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
            ReturnValues: 'UPDATED_NEW',
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

      if (found && result) {
        console.log('target result: ' + JSON.stringify(result, null, 2));
        break;
      }
    }
  }

  console.log(`Stopping polling`);
}
