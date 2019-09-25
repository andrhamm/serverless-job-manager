import configureContainer from '../../container';

function makeDeliveryLambdaGetJobLock({
  getLogger,
  lockJobByKey,
}) {
  return async function delivery(input) {
    const {
      input: executionInput,
      executionName,
    } = input;

    const {
      jobStatic: {
        guid,
        key: jobKey,
      },
    } = executionInput;

    const logger = getLogger();
    logger.addContext('guid', guid);
    logger.addContext('executionName', executionName);
    logger.debug(`event: ${JSON.stringify(input)}`);

    const job = await lockJobByKey(jobKey, executionName);

    return {
      ...input,
      ...job,
    };
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaGetJobLock);
