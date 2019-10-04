import configureContainer from '../../container';
import { camelCaseObj, snakeCaseObj, requireJson } from '../../lib/common';

function makeDeliveryLambdaSearchJobExecutions({ searchJobExecutions, getLogger }) {
  return async function delivery(input) {
    const logger = getLogger();
    logger.addContext('input', input);
    logger.debug('start');

    const {
      body: bodyJson,
      httpMethod,
      queryStringParameters,
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

    const queryParams = camelCaseObj(queryStringParameters || {});

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

    const response = {
      count: results.length,
      since: sinceMs,
      paging: {
        more: newMoreToken,
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
