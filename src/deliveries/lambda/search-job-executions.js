import middy from 'middy';
import {
  httpEventNormalizer,
  httpErrorHandler,
  httpHeaderNormalizer,
} from 'middy/middlewares';
import jsonBodiesMiddleware from '../../middlewares/json-bodies';
import configureContainer from '../../container';
import { camelCaseObj } from '../../lib/common';

function makeDeliveryLambdaSearchJobExecutions({
  searchJobExecutions,
  getLogger,
}) {
  let logger = getLogger();

  return middy(async (input) => {
    logger = getLogger();
    logger.addContext('input', input);
    logger.debug('start');

    const {
      body,
      queryStringParameters,
    } = input;

    const queryParams = camelCaseObj(queryStringParameters || {});

    const bodyParams = body || {};

    const params = {
      ...queryParams,
      ...bodyParams,
    };

    const {
      jobName,
      more: moreToken,
      serviceName,
      since,
    } = params;

    const {
      results,
      sinceMs,
      moreToken: newMoreToken,
    } = await searchJobExecutions({
      jobName,
      moreToken,
      serviceName,
      since,
    });

    return {
      count: results.length,
      since: sinceMs,
      paging: {
        more: newMoreToken,
      },
      results,
    };
  }).use(httpHeaderNormalizer())
    .use(httpEventNormalizer())
    .use(jsonBodiesMiddleware({ requireJson: true, logger }))
    .use(httpErrorHandler());
}

export const delivery = configureContainer().build(makeDeliveryLambdaSearchJobExecutions);
