import configureContainer from '../../container';

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

    return updatedJob;
  };
}

export const delivery = configureContainer().build(
  makeDeliveryLambdaExtendJobLock,
);

