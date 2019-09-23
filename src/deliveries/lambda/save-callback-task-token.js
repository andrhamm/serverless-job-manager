import configureContainer from '../../container';

function makeDeliveryLambdaSaveCallbackTaskToken({
  updateJobExecutionCallbackTaskToken,
  getLogger,
}) {
  return async function delivery(input, context, callback) {
    const {
      jobExecutionKey,
      callbackTaskToken,
    } = input;

    const logger = getLogger();
    // logger.addContext('guid', guid);
    logger.debug(`event: ${JSON.stringify(input)}`);

    await updateJobExecutionCallbackTaskToken(jobExecutionKey, callbackTaskToken);

    callback(null, { callbackTaskToken });
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaSaveCallbackTaskToken);
