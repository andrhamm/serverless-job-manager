import { stepfunctions } from '../lib/aws_clients';
import { parseSortKey } from '../../src/lib/job_executions_utils';

// DEPRECATED!
export const makeServiceExecutionCallback = ({
  stateMachineArnExecutionCallback,
}) => async function serviceExecutionCallback(
  jobGuid,
  jobExecutionKey,
  jobExecutionResult,
  callbackTimeMs,
) {
  const { sortKey } = jobExecutionKey;
  const {
    eventId,
    jobName,
    serviceName,
  } = parseSortKey(sortKey);
  const { status } = jobExecutionResult;
  const statusKey = status.slice(0, 1);

  const eventIdLast12 = eventId.slice(-12);

  // attempt to make an execution name that is somewhat human readable
  // on the AWS Step Functions console
  const executionName = `${serviceName.slice(0, 18)}.${jobName.slice(0, 18)}--${eventIdLast12}-${callbackTimeMs}-${statusKey}`;

  // TODO: move to an ExecutionsRepository
  const { serviceCallbackExecutionArn } = await stepfunctions.startExecution({
    stateMachineArn: stateMachineArnExecutionCallback,
    input: JSON.stringify({
      jobGuid,
      jobExecutionKey,
      jobExecutionResult,
      callbackTimeMs,
    }),
    name: executionName,
  }).promise();

  return {
    serviceCallbackExecutionArn,
  };
};
