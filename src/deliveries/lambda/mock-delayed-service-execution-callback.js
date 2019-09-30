import configureContainer from '../../container';

function makeDeliveryLambdaMockDelayedServiceExecutionCallback({
  mockDelayedServiceExecutionCallback,
  getLogger,
}) {
  return async function delivery(input) {
    const logger = getLogger();
    logger.debug(`event: ${JSON.stringify(input)}`);

    const { callbackUrl } = input;

    await mockDelayedServiceExecutionCallback(callbackUrl);

    return true;
  };
}

export const delivery = configureContainer().build(
  makeDeliveryLambdaMockDelayedServiceExecutionCallback,
);
