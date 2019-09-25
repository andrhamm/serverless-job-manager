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
    logger.debug(`event: ${JSON.stringify(input)}`);

    const res = await updateJobExecutionCallbackTaskToken(jobExecutionKey, callbackTaskToken);

    logger.debug(`updated ${res}`);

    return {
      callbackTaskToken,
    };
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaSaveCallbackTaskToken);
