import { dynamodb, dynamodbMarshall, dynamodbUnmarshall } from '../lib/aws_clients';
import { getPartitionKey, getSortKey } from '../lib/job_executions_utils';

const {
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
  DYNAMODB_PARTITION_COUNT_JOB_EXECUTIONS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    jobStatic: {
      serviceName,
      jobName,
    },
    jobExecution: {
      name: jobExecutionName,
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
    const { Attributes: jobExecution } = await dynamodb.putItem({
      TableName: DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
      ExpressionAttributeNames: {
        '#SORT': 'sortKey',
      },
      Item: dynamodbMarshall({
        event: {
          ...event,
          timeMs,
        },
        jobStatic: {
          serviceName,
          jobName,
        },
        ...executionKey,
        name: jobExecutionName,
        insertedAt: now,
        updatedAt: now,
      }),
      ConditionExpression: "attribute_not_exists(#SORT)",
      ReturnValues: 'ALL_NEW',
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

  output.jobExecution = {
    ...output.jobExecution,
    ...dynamodbUnmarshall(jobExecution),
    key: executionKey,
  };

  delete output.jobExecution.partitionKey;
  delete output.jobExecution.sortKey;

  callback(null, output);
}
