import middy from 'middy';
import {
  httpEventNormalizer,
  httpErrorHandler,
  httpHeaderNormalizer,
} from 'middy/middlewares';
import jsonBodiesMiddleware from '../../middlewares/json-bodies';
import configureContainer from '../../container';

function makeDeliveryLambdaSearchJobsByService({ searchJobsByService, getLogger }) {
  let logger = getLogger();

  return middy(async (input) => {
    logger = getLogger();
    logger.addContext('input', input);
    logger.debug('start');

    const {
      pathParameters: {
        serviceName,
      },
    } = input;

    const results = await searchJobsByService(serviceName);

    return results;
  }).use(httpHeaderNormalizer())
    .use(httpEventNormalizer())
    .use(jsonBodiesMiddleware({ requireJson: true, logger }))
    .use(httpErrorHandler());
}

export const delivery = configureContainer().build(makeDeliveryLambdaSearchJobsByService);
