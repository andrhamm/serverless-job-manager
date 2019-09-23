import configureContainer from '../../container';
import { camelCaseObj, snakeCaseObj } from '../../lib/common';

function makeDeliveryLambdaSearchJobs({ searchJobs, getLogger }) {
  // eslint-disable-next-line consistent-return
  return async function delivery(input, context, callback) {
    const logger = getLogger();
    // logger.addContext('jobKey', jobKey);
    logger.debug(`event: ${JSON.stringify(input)}`);

    const {
      multiValueQueryStringParameters,
    } = input;

    const {
      jobGuid: jobGuids,
      jobName: jobNames,
      serviceName: serviceNames,
    } = camelCaseObj(multiValueQueryStringParameters || {});

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
    }

    const results = await searchJobs(args);

    const response = {
      results: results.map(snakeCaseObj),
    };

    callback(null, {
      statusCode: 200,
      body: JSON.stringify(response, null, 2),
    });
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaSearchJobs);
