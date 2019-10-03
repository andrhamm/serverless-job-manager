import { stepfunctions } from '../lib/aws_clients';
import { delay } from '../lib/common';

export const makeAwaitStateMachineExecution = ({
  getLogger,
}) => async function awaitStateMachineExecution({
  stateMachineArn,
  executionInput,
  executionName,
}) {
  const logger = getLogger();
  // logger.addContext('guid', guid);

  // TODO: move to an ExecutionsRepository
  const { executionArn } = await stepfunctions.startExecution({
    stateMachineArn,
    input: JSON.stringify(executionInput),
    ...executionName && { name: executionName },
  }).promise();

  logger.debug(`Started execution ${executionName}`);

  let delayMs = 50;
  let execution;
  let attempt = 0;
  /* eslint-disable no-await-in-loop */
  do {
    await delay(delayMs);
    execution = await stepfunctions.describeExecution({ executionArn }).promise();
    attempt += 1;
    logger.debug(`attempt ${attempt} (${delayMs}ms) ${execution.status}`);
    delayMs = 200;
  } while (execution.status === 'RUNNING');
  /* eslint-enable no-await-in-loop */

  return execution;
};
