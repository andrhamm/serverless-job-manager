import middy from 'middy';
import {
  httpEventNormalizer,
  httpErrorHandler,
  httpHeaderNormalizer,
} from 'middy/middlewares';
import jsonBodiesMiddleware from '../../middlewares/json-bodies';
import configureContainer from '../../container';
import { camelCaseObj } from '../../lib/common';

function makeDeliveryLambdaSearchJobs({
  searchJobs,
  getLogger,
}) {
  // eslint-disable-next-line consistent-return
  let logger = getLogger();

  return middy(async (input) => {
    logger = getLogger();
    logger.addContext('input', input);
    logger.debug('start');

    const {
      body,
      multiValueQueryStringParameters,
    } = input;

    const bodyParams = {};
    if (body) {
      ['jobGuid', 'serviceName', 'jobName'].forEach((k) => {
        if (body[k]) {
          bodyParams[k] = Array.isArray(body[k]) ? body[k] : [body[k]];
        }
      });
    }

    const queryParams = camelCaseObj(multiValueQueryStringParameters || {});

    const params = {
      ...queryParams,
      ...bodyParams,
    };

    const {
      jobGuid: jobGuids,
      jobName: jobNames,
      serviceName: serviceNames,
    } = params;

    const args = {};
    if (jobGuids) {
      args.jobGuids = jobGuids;
    } else if (jobNames) {
      const statusCode = 400;

      if (!serviceNames ||
          (jobNames.length > 1 && (
            serviceNames.length > 1 && serviceNames.length !== jobNames.length))
      ) {
        return {
          statusCode, body: { message: 'Missing or invalid service_name' },
        };
      }

      const jobKeys = jobNames.map((jobName, i) => {
        const serviceName = serviceNames[i] || serviceNames[0];
        return { serviceName, jobName };
      });

      args.jobKeys = jobKeys;
    } else {
      // all jobs
      args.serviceName = (serviceNames || [])[0];
    }

    const results = await searchJobs(args);

    return { results };
  }).use(httpHeaderNormalizer())
    .use(httpEventNormalizer())
    .use(jsonBodiesMiddleware({ requireJson: true, logger }))
    .use(httpErrorHandler());
}

export const delivery = configureContainer().build(makeDeliveryLambdaSearchJobs);
