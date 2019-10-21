import middy from 'middy';
import {
  httpEventNormalizer,
  httpErrorHandler,
  httpHeaderNormalizer,
} from 'middy/middlewares';
import jsonBodiesMiddleware from '../../middlewares/json-bodies';
import configureContainer from '../../container';

function makeDeliveryLambdaDeleteJob({
  softDeleteJob,
  getLogger,
}) {
  let logger = getLogger(); // this is probably not the right way to do this...

  return middy(async (input) => {
    const {
      pathParameters: {
        serviceName,
        jobName,
      },
    } = input;

    const jobKey = {
      serviceName,
      jobName,
    };

    logger = getLogger();
    logger.addContext('jobKey', jobKey);
    logger.addContext('input', input);
    logger.debug('start');

    await softDeleteJob(jobKey);

    return '';
  }).use(httpHeaderNormalizer())
    .use(httpEventNormalizer())
    .use(jsonBodiesMiddleware({ requireJson: true, logger }))
    .use(httpErrorHandler());
}

export const delivery = configureContainer().build(makeDeliveryLambdaDeleteJob);
