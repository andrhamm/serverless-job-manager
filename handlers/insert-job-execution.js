import { dynamodb, dynamodbMarshall } from '../lib/aws_clients';
import { getPartitionKey, getSortKey } from '../lib/job_executions_utils';

const {
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
  DYNAMODB_PARTITION_COUNT_JOB_EXECUTIONS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const { eventId } = input;

  const partitionKey = getPartitionKey(eventId, DYNAMODB_PARTITION_COUNT_JOB_EXECUTIONS);
  const sortKey = getSortKey(input);
  const now = Date.now();

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
        ...input,
        ...executionKey,
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

  callback(null, {
    ...input,
    executionKey,
  });
}
