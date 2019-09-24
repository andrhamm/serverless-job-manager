import configureContainer from '../../container';
import { camelCaseObj, snakeCaseObj } from '../../lib/common';

function makeDeliveryLambdaSearchJobsByService({ searchJobsByService, getLogger }) {
  return async function delivery(input, context, callback) {
    const logger = getLogger();
    // logger.addContext('jobKey', jobKey);
    logger.debug(`event: ${JSON.stringify(input)}`);

    const {
      pathParameters,
    } = input;

    const pathParams = camelCaseObj(pathParameters || {});

    const results = await searchJobsByService(pathParams.serviceName);

    callback(null, {
      statusCode: 200,
      body: JSON.stringify({ results: results.map(snakeCaseObj) }, null, 2),
    });
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaSearchJobsByService);