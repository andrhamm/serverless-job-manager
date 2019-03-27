import { dynamodb } from '../lib/aws_clients';

const {
  DYNAMODB_INDEX_NAME_JOBS_GUID,
  DYNAMODB_TABLE_NAME_JOBS,
} = process.env;

// DEPRECATED for now, the CW event now passes in the jobGuid and jobName and serviceName!
export const handler = async (input, context, callback) => {
  const {
    jobGuid,
  } = input;

  // this is an eventually consistent read to
  // lookup service name and job name by guid
  // let jobResult;
  try {
    const {
      Items: {
        [0]: jobKey
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
      ProjectionExpression: 'service_name, job_name',
      Limit: 1,
    }).promise();

    callback(null, {
      ...input,
      jobKey
    });
  } catch (e) {
    callback(e);
  }
};
