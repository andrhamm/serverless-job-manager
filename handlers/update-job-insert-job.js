import { dynamodb, dynamodbMarshall } from '../lib/aws_clients';

const {
  DYNAMODB_TABLE_NAME_JOBS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    async,
    enabled,
    exclusive,
    guid,
    invocationTarget,
    invocationType,
    jobName,
    payload,
    schedule,
    serviceName,
    ttlSeconds,
  } = input;

  const deletedAt = null;

  const params = {
    async,
    deletedAt,
    enabled,
    exclusive,
    guid,
    invocationTarget,
    invocationType,
    jobName,
    payload,
    schedule,
    serviceName,
    ttlSeconds,
  };

  await dynamodb.putItem({
    TableName: DYNAMODB_TABLE_NAME_JOBS,
    Item: dynamodbMarshall(params)
  }).promise();

  callback(null, params);
};
