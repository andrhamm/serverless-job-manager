import { dynamodb, dynamodbMarshall, dynamodbUnmarshall } from '../lib/aws_clients';
import { getPartitionKey, getSortKey } from '../lib/job_executions_utils';

const {
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
  DYNAMODB_PARTITION_COUNT_JOB_EXECUTIONS,
} = process.env;

export const handler = async (executionInput, context, callback) => {
  console.log('event: ' + JSON.stringify(executionInput, null, 2));

  const {
    input,
    executionName,
  } = executionInput;

  const {
    jobStatic: {
      key: {
        serviceName,
        jobName,
      },
    },
    jobExecution: {
      event,
    },
  } = input;

  const {
    id: eventId,
    time: eventTime,
  } = event;

  const partitionKey = getPartitionKey(eventId, DYNAMODB_PARTITION_COUNT_JOB_EXECUTIONS);
  const sortKey = getSortKey(serviceName, jobName, eventTime, eventId);
  const now = parseInt(Date.now() / 1000);

  const executionKey = {
    partitionKey,
    sortKey,
  };

  const timeMs = (new Date(eventTime)).getTime();

  // try {
    await dynamodb.putItem({
      TableName: DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
      ExpressionAttributeNames: {
        '#SORT': 'sortKey',
      },
      Item: dynamodbMarshall({
        event: {
          ...event,
          timeMs,
        },
        ...executionKey,
        name: executionName,
        insertedAt: now,
        updatedAt: now,
      }),
      ConditionExpression: "attribute_not_exists(#SORT)",
      // ReturnValues only supports ALL_OLD or NONE for putItem
    }).promise();
  // } catch (e) {
    // TODO: add error catching to the step function config
    // if (e.code === 'ConditionalCheckFailedException') {
    //   callback(null, null);
    // } else {
      // callback(e);
    // }
  //   return;
  // }

  const output = {
    ...input,
  };

  output.jobExecution.key = executionKey;
  output.jobExecution.event.timeMs = timeMs;

  delete output.jobExecution.partitionKey;
  delete output.jobExecution.sortKey;

  return output;
}
