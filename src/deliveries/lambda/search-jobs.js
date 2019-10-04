import configureContainer from '../../container';
import { camelCaseObj, snakeCaseObj, requireJson } from '../../lib/common';

function makeDeliveryLambdaSearchJobs({ searchJobs, getLogger }) {
  // eslint-disable-next-line consistent-return
  return async function delivery(input) {
    const logger = getLogger();
    logger.addContext('input', input);
    logger.debug('start');

    const {
      body: bodyJson,
      httpMethod,
      multiValueQueryStringParameters,
    } = input;

    // API Gateway doesn't let you require a specific content-type, so if
    // it is not json, the jsonschema validation will not have been applied
    let bodyParams = {};
    if (httpMethod !== 'GET' && bodyJson) {
      const notJson = requireJson(input.headers);
      if (notJson) {
        return notJson;
      }

      bodyParams = camelCaseObj(JSON.parse(bodyJson));
    }

    ['jobGuid', 'serviceName', 'jobName'].forEach((k) => {
      if (bodyParams[k]) {
        if (!Array.isArray(bodyParams[k])) {
          bodyParams[k] = [bodyParams[k]];
        }
      } else {
        bodyParams[k] = [];
      }
    });

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
      const headers = { 'Content-Type': 'application/json' };

      if (!serviceNames ||
          (jobNames.length > 1 && (
            serviceNames.length > 1 && serviceNames.length !== jobNames.length))
      ) {
        return {
          statusCode, headers, body: '{"message":"Missing or invalid service_name"}',
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

    const response = {
      results: results.map(snakeCaseObj),
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response, null, 2),
    };
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaSearchJobs);
