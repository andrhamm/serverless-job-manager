import configureContainer from '../../container';
import { camelCaseObj, snakeCaseObj } from '../../lib/common';

function makeDeliveryLambdaSearchJobExecutions({ searchJobExecutions, getLogger }) {
  return async function delivery(input) {
    const logger = getLogger();
    // logger.addContext('jobKey', jobKey);
    logger.debug(`event: ${JSON.stringify(input)}`);

    const {
    // resource,
    // pathParameters,
    // multiValueQueryStringParameters,
      queryStringParameters,
      body: bodyJson,
    } = input;

    // TODO: req validation w/ jsonschema
    const body = camelCaseObj(JSON.parse(bodyJson || '{}'));
    const params = camelCaseObj(queryStringParameters || {});
    // const multiParams = camelCaseObj(multiValueQueryStringParameters || {});
    const {
      since,
      serviceName,
      jobName,
    } = params;

    const {
      results,
      sinceMs,
      moreToken,
    } = await searchJobExecutions({
      since,
      serviceName,
      jobName,
      moreToken: body.more,
    });

    const response = {
      count: results.length,
      since: sinceMs,
      paging: {
        more: moreToken,
      },
      // TODO: filter response
      results: results.map((result) => {
        const parsedExecution = snakeCaseObj(result);
        parsedExecution.event = snakeCaseObj(result.event);
        parsedExecution.result = snakeCaseObj(result.result);
        return parsedExecution;
      }),
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response, null, 2),
    };
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaSearchJobExecutions);
