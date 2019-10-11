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

    const {
      callbackUrl,
      heartbeatIntervalSeconds,
      requestTimeMs,
      ttlSeconds,
    } = input;

    await mockDelayedServiceExecutionCallback({
      callbackUrl,
      heartbeatIntervalSeconds,
      requestTimeMs,
      ttlSeconds,
    });

    return true;
  };
}

export const delivery = container.build(
  makeDeliveryLambdaMockDelayedServiceExecutionCallback,
);
