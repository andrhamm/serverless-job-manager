// import { asValue } from 'awilix';
import configureContainer from '../../container';
import { camelCaseObj } from '../../lib/common';

const container = configureContainer();

function makeDeliveryLambdaMockHttpInvokeTarget({
  invokeMockDelayedCallback,
  getLogger,
}) {
  return async function delivery(input) {
    const logger = getLogger();
    // container.register('logger', asValue(logger));
    logger.addContext('input', input);
    logger.debug('start');

    const {
      body: bodyJson,
      requestContext: {
        requestTimeEpoch: requestTimeMs,
      },
    } = input;

    const body = JSON.parse(bodyJson);

    const {
      callbackUrl,
      heartbeatIntervalSeconds,
      ttlSeconds,
    } = camelCaseObj(body);

    await invokeMockDelayedCallback({
      callbackUrl,
      heartbeatIntervalSeconds,
      requestTimeMs,
      ttlSeconds,
    });

    return {
      statusCode: 204,
      body: '',
    };
  };
}

export const delivery = container.build(makeDeliveryLambdaMockHttpInvokeTarget);
