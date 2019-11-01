import middy from 'middy';
import {
  httpEventNormalizer,
  httpErrorHandler,
  httpHeaderNormalizer,
} from 'middy/middlewares';
import jsonBodiesMiddleware from '../../middlewares/json-bodies';
import configureContainer from '../../container';

const container = configureContainer();

function makeDeliveryLambdaMockHttpInvokeTarget({
  invokeMockDelayedCallback,
  getLogger,
}) {
  let logger = getLogger();

  return middy(async (input) => {
    logger = getLogger();
    // container.register('logger', asValue(logger));
    logger.addContext('input', input);
    logger.debug('start');

    const {
      body,
      requestContext: {
        requestTimeEpoch: requestTimeMs,
      },
    } = input;

    const {
      callbackUrl,
      heartbeatIntervalSeconds,
      ttlSeconds,
    } = body;

    await invokeMockDelayedCallback({
      callbackUrl,
      heartbeatIntervalSeconds,
      requestTimeMs,
      ttlSeconds,
    });

    return '';
  }).use(httpHeaderNormalizer())
    .use(httpEventNormalizer())
    .use(jsonBodiesMiddleware({ requireJson: true, logger }))
    .use(httpErrorHandler());
}

export const delivery = container.build(makeDeliveryLambdaMockHttpInvokeTarget);
