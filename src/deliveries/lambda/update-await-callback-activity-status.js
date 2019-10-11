import configureContainer from '../../container';

function makeDeliveryLambdaUpdateAwaitCallbackActivityStatus({
  getLogger,
  updateAwaitCallbackActivityStatus,
}) {
  return async function delivery(inputs) {
    const logger = getLogger();
    logger.addContext('input', inputs);
    logger.debug('start');

    const input = Object.assign({}, ...inputs);
    const {
      jobExecution: {
        callbackTaskToken,
      },
      jobExecutionResult,
    } = input;

    const callbackResult = await updateAwaitCallbackActivityStatus(
      jobExecutionResult,
      callbackTaskToken,
    );

    return {
      ...input,
      callbackResult,
    };
  };
}

export const delivery = configureContainer().build(
  makeDeliveryLambdaUpdateAwaitCallbackActivityStatus,
);

