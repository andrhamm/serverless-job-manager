import configureContainer from '../../container';

function makeDeliveryLambdaMockDelayedServiceExecutionCallback({
  mockDelayedServiceExecutionCallback,
  getLogger,
}) {
  return async function delivery(input, context, callback) {
    try {
      const logger = getLogger();
      logger.debug(`event: ${JSON.stringify(input)}`);

      const { callbackUrl } = input;

      await mockDelayedServiceExecutionCallback(callbackUrl);

      callback(null, true);
    } catch (error) {
      console.log('ERRORRRRRRR');
      console.log(error);
    }
  };
}

export const delivery = configureContainer().build(
  makeDeliveryLambdaMockDelayedServiceExecutionCallback,
);
