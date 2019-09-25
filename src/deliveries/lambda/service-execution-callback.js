import configureContainer from '../../container';

import { decodeEncodedJobExecutionKey, filterJobExecutionResult } from '../../lib/job_executions_utils';

function makeDeliveryLambdaServiceExecutionCallback({ serviceExecutionCallback, getLogger }) {
  return async function delivery(input, context, callback) {
    const logger = getLogger();
    // logger.addContext('jobKey', jobKey);
    logger.debug(`event: ${JSON.stringify(input)}`);

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

    await serviceExecutionCallback(jobGuid, jobExecutionKey, filteredJobExecutionResult);

    callback(null, {
      statusCode: 204,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaServiceExecutionCallback);
