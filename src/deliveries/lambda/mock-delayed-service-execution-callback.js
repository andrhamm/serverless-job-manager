// import { asValue } from 'awilix';
import configureContainer from '../../container';

const container = configureContainer();

function makeDeliveryLambdaMockDelayedServiceExecutionCallback({
  mockDelayedServiceExecutionCallback,
  getLogger,
}) {
  return async function delivery(input) {
    const logger = getLogger();
    // container.register('logger', asValue(logger));
    logger.addContext('input', input);
    logger.debug('start');

    const { callbackUrl } = input;

    await mockDelayedServiceExecutionCallback(callbackUrl);

    return true;
  };
}

export const delivery = container.build(
  makeDeliveryLambdaMockDelayedServiceExecutionCallback,
);
