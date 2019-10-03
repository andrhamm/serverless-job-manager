import { stepfunctions } from '../lib/aws_clients';
import { parseSortKey } from '../../src/lib/job_executions_utils';

export const makeServiceExecutionCallback = ({
  stateMachineArnExecutionCallback,
}) => async function serviceExecutionCallback(jobGuid, jobExecutionKey, jobExecutionResult) {
  const { sortKey } = jobExecutionKey;
  const { eventId } = parseSortKey(sortKey);
  const executionName = `${jobGuid}--${eventId}`;

  // TODO: move to an ExecutionsRepository
  const { serviceCallbackExecutionArn } = await stepfunctions.startExecution({
    stateMachineArn: stateMachineArnExecutionCallback,
    input: JSON.stringify({
      jobGuid,
      jobExecutionKey,
      jobExecutionResult,
    }),
    name: executionName,
  }).promise();

  return {
    serviceCallbackExecutionArn,
  };
};
