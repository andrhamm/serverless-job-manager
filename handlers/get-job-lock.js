import { dynamodb, dynamodbUnmarshall, dynamodbMarshall } from '../lib/aws_clients';
import { camelCaseObj } from '../lib/common';

const {
  DYNAMODB_TABLE_NAME_JOBS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    jobName,
    serviceName,
    executionName,
  } = input;

  // does a consistent write to get a lock on the job
  const {
    Attributes: job
  } = await dynamodb.updateItem({
    TableName: DYNAMODB_TABLE_NAME_JOBS,
    Key: dynamodbMarshall({
      serviceName,
      jobName,
    }),
    ExpressionAttributeNames: {
      '#LEX': 'lockExecution',
      '#LEA': 'lockExpiresAt',
      '#TTL': 'ttlSeconds',
    },
    ExpressionAttributeValues: dynamodbMarshall({
      ':now': parseInt(Date.now() / 1000),
      ':lex': executionName,
    }),
    UpdateExpression: "SET #LEA = :now + #TTL, #LEX = :lex",
    ConditionExpression: "attribute_not_exists(#LEA) OR (attribute_exists(#LEA) AND #LEA < :now)",
    ReturnValues: 'ALL_NEW',
  }).promise();

  // the input already has many of the job properties specific to the execution event,
  // but later we will need other properties from the job so add those (previous state, ttl_seconds, etc)
  const parsedJob = dynamodbUnmarshall(job);
  const filteredJob = Object.entries(parsedJob).reduce((acc, [k, v]) => {
    if (!input.hasOwnProperty(k)) {
      acc[k] = v;
    }
    return acc;
  }, {});

  callback(null, {
    ...input,
    job: filteredJob,
  });
};
