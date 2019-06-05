import { dynamodb, dynamodbUnmarshall, dynamodbMarshall } from '../lib/aws_clients';
import { camelCaseObj, filterProps } from '../lib/common';
import { splitJobStaticProps } from '../lib/job_executions_utils';

const {
  DYNAMODB_TABLE_NAME_JOBS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    jobStatic: {
      key: jobKey,
    },
  } = input;

  const params = {
    TableName: DYNAMODB_TABLE_NAME_JOBS,
    Key: dynamodbMarshall(jobKey),
    ExpressionAttributeNames: {
      '#lockExecution': 'lockExecution',
      '#lockExpiresAt': 'lockExpiresAt',
      '#ttlSeconds': 'ttlSeconds',
    },
    ExpressionAttributeValues: dynamodbMarshall({
      ':now': parseInt(Date.now() / 1000),
      ':lockExecution': jobExecutionName,
      ':nulltype': 'NULL',
      ':numtype': 'N',
    }),
    UpdateExpression: `SET #lockExpiresAt = :now + #ttlSeconds, #lockExecution = :lockExecution`,
    ConditionExpression:
      `attribute_not_exists(#lockExpiresAt) OR ` +
      `attribute_type(#lockExpiresAt, :nulltype) OR ` +
      `( attribute_type(#lockExpiresAt, :numtype) AND #lockExpiresAt < :now )`,
    ReturnValues: 'ALL_NEW',
  };

  console.log(`updateItem params: ${JSON.stringify(params, null, 2)}`);

  // does a consistent write to get a lock on the job
  const {
    Attributes: jobUpdated
  } = await dynamodb.updateItem(params).promise();

  // the input already has many of the job properties specific to the execution event,
  // but later we will need other properties from the job so add those (previous state, ttl_seconds, etc)
  const parsedJob = dynamodbUnmarshall(jobUpdated);

  const { job, jobStatic } = splitJobStaticProps(parsedJob);

  const output = {
    ...input,
    job,
    jobStatic,
  };

  delete output.sqs;

  callback(null, output);
};
