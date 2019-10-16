import configureContainer from '../../container';
import { snakeCaseObj } from '../../lib/common';

function makeDeliveryLambdaExtendJobLock({
  extendJobLockByJobKey,
  getLogger,
}) {
  return async function delivery(input) {
    const logger = getLogger();
    logger.addContext('input', input);
    logger.debug('start');

    const {
      jobStatic: {
        key: jobKey,
      },
      jobExecution: {
        name: jobExecutionName,
      },
      callbackResult: {
        progress,
      },
    } = input;

    const updatedJob = await extendJobLockByJobKey({
      jobExecutionName,
      jobKey,
      progress,
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(snakeCaseObj(updatedJob)),
    };
  };
}

export const delivery = configureContainer().build(
  makeDeliveryLambdaExtendJobLock,
);

