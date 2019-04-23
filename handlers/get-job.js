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

  const jobResp = await dynamodb.getItem({
    TableName: DYNAMODB_TABLE_NAME_JOBS,
    ConsistentRead: true,
    Key: dynamodbMarshall(jobKey),
  }).promise();

  console.log(`jobResp: ${JSON.stringify(jobResp, null, 2)}`);

  /// the input already has many of the job properties specific to the execution event,
  // but later we will need other properties from the job so add those (previous state, ttl_seconds, etc)
  const parsedJob = dynamodbUnmarshall(jobResp.Item);
  // const filteredJob = filterProps(parsedJob, input.jobStatic);

  const {
    jobStatic,
    job,
  } = splitJobStaticProps(parsedJob)

  callback(null, {
    ...input,
    jobStatic,
    job,
  });
};
