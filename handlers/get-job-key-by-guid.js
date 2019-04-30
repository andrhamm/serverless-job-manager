import { getJobKeyByGuid } from '../lib/dynamodb_utils';

const {
  DYNAMODB_INDEX_NAME_JOBS_GUID,
  DYNAMODB_TABLE_NAME_JOBS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const { jobGuid } = input;

  const key = await getJobKeyByGuid(jobGuid, {
    DYNAMODB_INDEX_NAME_JOBS_GUID,
    DYNAMODB_TABLE_NAME_JOBS,
  });

  callback(null, {
    jobStatic: { key }
  });
};
