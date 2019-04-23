import { dynamodb, dynamodbUnmarshall } from '../lib/aws_clients';
import { dynamoDbSearch } from '../lib/dynamodb_utils';

const {
  DYNAMODB_INDEX_NAME_JOBS_GUID,
  DYNAMODB_TABLE_NAME_JOBS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const { jobGuid } = input;

  // NOTE: this is an eventually consistent read
  // on a global secondary index (consistent reads
  // on GSIs are not supported)
  // Fields returned are only those projected onto the index
  // ... meaning a subsequent call to getItem is required to
  // get all of the job's fields
  const queryResp = await dynamodb.query({
    TableName: DYNAMODB_TABLE_NAME_JOBS,
    IndexName: DYNAMODB_INDEX_NAME_JOBS_GUID,
    ExpressionAttributeValues: {
      ':guid' : {
        S: jobGuid,
      },
    },
    KeyConditionExpression: 'guid = :guid',
    Limit: 1,
  }).promise();

  console.log(`queryResp: ${JSON.stringify(queryResp, null, 2)}`);

  const {
    Items: {
      [0]: job
    }
  } = queryResp;

  const {
    serviceName,
    jobName,
  } = dynamodbUnmarshall(job);

  callback(null, {
    jobStatic: {
      key: {
        serviceName,
        jobName,
      }
    }
  });
};
