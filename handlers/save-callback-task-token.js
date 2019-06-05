import { dynamodb, dynamodbMarshall, dynamodbUnmarshall } from '../lib/aws_clients';
import { getPartitionKey, getSortKey } from '../lib/job_executions_utils';

const {
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    jobExecutionKey,
    callbackTaskToken,
  } = input;

  await dynamodb.updateItem({
    TableName: DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
    Key: dynamodbMarshall(jobExecutionKey),
    ExpressionAttributeNames: {
      '#callbackTaskToken': 'callbackTaskToken',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: dynamodbMarshall({
      ':now': parseInt(Date.now() / 1000),
      ':callbackTaskToken': callbackTaskToken,
    }),
    UpdateExpression: 'SET #updatedAt = :now, #callbackTaskToken = :callbackTaskToken',
  }).promise();

  callback(null, { callbackTaskToken });
}
