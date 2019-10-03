import configureContainer from '../../container';

function makeDeliveryLambdaGetJobLock({
  getLogger,
  lockJobByKey,
}) {
  return async function delivery(input) {
    const {
      executionInput,
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
    logger.addContext('input', input);
    logger.debug('start');

    const job = await lockJobByKey(jobKey, executionName);

    const output = {
      ...executionInput,
      ...job,
    };

    logger.addContext('output', output);
    logger.debug('end');

    return JSON.parse(JSON.stringify(output));
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaGetJobLock);
