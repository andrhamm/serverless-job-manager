import { dynamodb, dynamodbMarshall } from '../lib/aws_clients';
import { getPartitionKey, getSortKey } from '../lib/job_executions_utils';

const {
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
  DYNAMODB_PARTITION_COUNT_JOB_EXECUTIONS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    event: {
      id: eventId,
      time: eventTime,
    },
    jobStatic: {
      serviceName,
      jobName,
    },
    jobExecution: {
      name: jobExecutionName,
    },
  } = input;

  const partitionKey = getPartitionKey(eventId, DYNAMODB_PARTITION_COUNT_JOB_EXECUTIONS);
  const sortKey = getSortKey(serviceName, jobName, eventTime, eventId);
  const now = parseInt(Date.now() / 1000);

  const executionKey = {
    partitionKey,
    sortKey,
  };

  // try {
    await dynamodb.putItem({
      TableName: DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
      ExpressionAttributeNames: {
        '#SORT': 'sortKey',
      },
      Item: dynamodbMarshall({
        event: input.event,
        ...executionKey,
        name: jobExecutionName,
        insertedAt: now,
        updatedAt: now,
      }),
      ConditionExpression: "attribute_not_exists(#SORT)",
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
  delete output.jobExecution.partitionKey;
  delete output.jobExecution.sortKey;

  callback(null, output);
}
