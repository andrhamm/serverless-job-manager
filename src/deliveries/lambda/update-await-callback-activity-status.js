import configureContainer from '../../container';

function makeDeliveryLambdaUpdateAwaitCallbackActivityStatus({
  getLogger,
  updateAwaitCallbackActivityStatus,
}) {
  return async function delivery(inputs, context, callback) {
    const logger = getLogger();
    // logger.addContext('guid', guid);
    logger.debug(`event: ${JSON.stringify(inputs)}`);

    const input = Object.assign({}, ...inputs);
    const {
      jobExecution: {
        callbackTaskToken,
      },
      jobExecutionResult,
    } = input;

    await updateAwaitCallbackActivityStatus(jobExecutionResult, callbackTaskToken);

    callback(null, {});
  };
}

export const delivery = configureContainer().build(
  makeDeliveryLambdaUpdateAwaitCallbackActivityStatus,
);

