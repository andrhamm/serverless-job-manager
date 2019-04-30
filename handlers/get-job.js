import { splitJobStaticProps } from '../lib/job_executions_utils';
import { getJob } from '../lib/dynamodb_utils';

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

  const jobRaw = await getJob(jobKey, {
    DYNAMODB_TABLE_NAME_JOBS,
  });

  const {
    jobStatic,
    job,
  } = splitJobStaticProps(jobRaw);

  callback(null, {
    ...input,
    jobStatic,
    job,
  });
};
