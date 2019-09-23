import configureContainer from '../../container';

function makeDeliveryLambdaMockDelayedServiceExecutionCallback({
  mockDelayedServiceExecutionCallback,
  getLogger,
}) {
  return async function delivery(input, context, callback) {
    const logger = getLogger();
    logger.debug(`event: ${JSON.stringify(input)}`);

    const { callbackUrl } = input;

    await mockDelayedServiceExecutionCallback(callbackUrl);

    callback();
  };
}

export const delivery = configureContainer().build(
  makeDeliveryLambdaMockDelayedServiceExecutionCallback,
);
