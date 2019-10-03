import configureContainer from '../../container';

function makeDeliveryLambdaSaveCallbackTaskToken({
  updateJobExecutionCallbackTaskToken,
  getLogger,
}) {
  return async function delivery(input) {
    const {
      jobExecutionKey,
      callbackTaskToken,
    } = input;

    const logger = getLogger();
    // logger.addContext('guid', guid);
    logger.addContext('input', input);
    logger.debug('start');

    const res = await updateJobExecutionCallbackTaskToken(jobExecutionKey, callbackTaskToken);

    logger.debug(`updated ${res}`);

    return {
      callbackTaskToken,
    };
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaSaveCallbackTaskToken);
