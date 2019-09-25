import configureContainer from '../../container';

function makeDeliveryLambdaUpdateJobWithExecutionResults({
  getLogger,
  updateJobWithExecutionResults,
}) {
  return async function delivery(inputs, context, callback) {
    const input = Object.assign({}, ...inputs);

    const {
      jobStatic: {
        exclusive,
        guid,
        key: jobKey,
      },
      jobExecution: {
        name: jobExecutionName,
        event: {
          time: eventTime,
        },
        serviceInvokedAt,
      },
      jobExecutionResult,
    } = input;

    const logger = getLogger();
    logger.addContext('guid', guid);
    logger.addContext('jobExecutionName', jobExecutionName);
    logger.debug(`event: ${JSON.stringify(inputs)}`);

    let updatedJob = {};

    if (exclusive) {
      updatedJob = await updateJobWithExecutionResults(
        jobKey,
        jobExecutionName,
        eventTime,
        serviceInvokedAt,
        jobExecutionResult,
      );
    }

    callback(null, updatedJob);
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaUpdateJobWithExecutionResults);
