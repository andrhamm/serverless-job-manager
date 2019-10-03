import configureContainer from '../../container';
import { camelCaseObj, snakeCaseObj } from '../../lib/common';

function makeDeliveryLambdaSearchJobsByService({ searchJobsByService, getLogger }) {
  return async function delivery(input) {
    const logger = getLogger();
    logger.addContext('input', input);
    logger.debug('start');

    const {
      pathParameters,
    } = input;

    const pathParams = camelCaseObj(pathParameters || {});

    const results = await searchJobsByService(pathParams.serviceName);

    return {
      statusCode: 200,
      body: JSON.stringify({ results: results.map(snakeCaseObj) }, null, 2),
    };
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaSearchJobsByService);
