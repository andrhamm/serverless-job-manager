import { stepfunctions } from '../lib/aws_clients';

export const makeGetFailedExecutions = () => async function getFailedExecutions({
  maxResults = 1000,
  nextToken,
  stateMachineArn,
  statusFilter = 'FAILED',
  dateFilter, // get executions older than this date
}) {
  // TODO: move to an ExecutionsRepository
  const {
    executions,
    nextToken: nextNextToken,
  } = await stepfunctions.listExecutions({
    maxResults,
    ...nextToken && { nextToken },
    stateMachineArn,
    statusFilter,
  }).promise();

  const time = (new Date(dateFilter)).getTime();
  const filterFn = ({ stopDate }) => stopDate && stopDate.getTime() <= time;

  const filteredExecutions = dateFilter ? executions.filter(filterFn) : executions;

  return {
    executions: filteredExecutions,
    nextToken: nextNextToken,
  };
};
