import { dynamodb, dynamodbUnmarshall } from '../lib/aws_clients';

const {
  DYNAMODB_INDEX_NAME_JOBS_GUID,
  DYNAMODB_TABLE_NAME_JOBS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const { jobGuid } = input.pathParameters;

  // NOTE: this is an eventually consistent read
  // on a global secondary index (consistent reads
  // on GSIs are not supported)
  const {
    Items: {
      [0]: job
    }
  } = await dynamodb.query({
    TableName: DYNAMODB_TABLE_NAME_JOBS,
    IndexName: DYNAMODB_INDEX_NAME_JOBS_GUID,
    ExpressionAttributeValues: {
      ':guid' : {
        S: jobGuid
      }
    },
    KeyConditionExpression: 'guid = :guid',
    Limit: 1,
  }).promise();

  callback(null, {
    job: dynamodbUnmarshall(job)
  });
};
