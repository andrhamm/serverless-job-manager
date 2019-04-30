import { stepfunctions } from '../../lib/aws_clients';
import { decodeEncodedJobExecutionKey, parseSortKey, filterJobExecutionResult } from '../../lib/job_executions_utils';

const {
  STATE_MACHINE_ARN_EXECUTION_CALLBACK
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    pathParameters: {
      jobGuid,
      encodedJobExecutionKey,
    },
    body: jobExecutionResultJson
  } = input;

  // TODO: validate!
  const jobExecutionResult = jobExecutionResultJson ? JSON.parse(jobExecutionResultJson) : {};
  const filteredJobExecutionResult = filterJobExecutionResult(jobExecutionResult);

  const jobExecutionKey = decodeEncodedJobExecutionKey(decodeURIComponent(encodedJobExecutionKey));

  const { sortKey } = jobExecutionKey;

  const { eventId } = parseSortKey(sortKey);

  const executionName = `${jobGuid}--${eventId}`;

  const { executionArn } = await stepfunctions.startExecution({
    stateMachineArn: STATE_MACHINE_ARN_EXECUTION_CALLBACK,
    input: JSON.stringify({
      jobGuid,
      jobExecutionKey,
      jobExecutionResult: filteredJobExecutionResult,
    }),
    name: executionName,
  }).promise();

  callback(null,  {
    statusCode: 204,
    headers: {
      'Content-Type': 'application/json'
    },
  });
}
