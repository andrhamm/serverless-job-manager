import configureContainer from '../../container';
import { requireJson } from '../../lib/common';

import { decodeEncodedJobExecutionKey, filterJobExecutionResult } from '../../lib/job_executions_utils';

function makeDeliveryLambdaServiceExecutionCallback({
  serviceExecutionCallback,
  getLogger,
}) {
  return async function delivery(input) {
    const logger = getLogger();
    logger.addContext('input', input);
    logger.debug('start');

    // API Gateway doesn't let you require a specific content-type, so if
    // it is not json, the jsonschema validation will not have been applied
    const notJson = requireJson(input.headers);
    if (notJson) {
      return notJson;
    }

    const {
      pathParameters: {
        jobGuid,
        encodedJobExecutionKey,
      },
      body: jobExecutionResultJson,
    } = input;

    // TODO: validate!
    const jobExecutionKey = decodeEncodedJobExecutionKey(
      decodeURIComponent(encodedJobExecutionKey),
    );
    const jobExecutionResult = jobExecutionResultJson ? JSON.parse(jobExecutionResultJson) : {};
    const filteredJobExecutionResult = filterJobExecutionResult(jobExecutionResult);

    const { serviceCallbackExecutionArn } = await serviceExecutionCallback(
      jobGuid,
      jobExecutionKey,
      filteredJobExecutionResult,
    );

    logger.addContext('serviceCallbackExecutionArn', serviceCallbackExecutionArn);
    logger.debug('end');

    return {
      statusCode: 204,
      body: '',
    };
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaServiceExecutionCallback);
