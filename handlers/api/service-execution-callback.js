import { stepfunctions } from '../../lib/aws_clients';
import { decodeEncodedJobExecutionKey, parseSortKey } from '../../lib/job_executions_utils';

const {
  STATE_MACHINE_ARN_EXECUTION_CALLBACK
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    pathParameters: {
      jobGuid,
      encodedExecutionKey: encodedJobExecutionKey,
    },
    body: bodyJson
  } = input;

  // TODO: validate!
  const body = bodyJson ? JSON.parse(bodyJson) : {};

  const jobExecutionKey = decodeEncodedJobExecutionKey(encodedJobExecutionKey);

  const { sortKey } = jobExecutionKey;

  const { eventId } = parseSortKey(sortKey);

  const executionName = `${jobGuid}--${eventId}`;

  const { executionArn } = await stepfunctions.startExecution({
    stateMachineArn: STATE_MACHINE_ARN_EXECUTION_CALLBACK,
    input: JSON.stringify({
      jobGuid,
      jobExecutionKey,
      result: body,
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
