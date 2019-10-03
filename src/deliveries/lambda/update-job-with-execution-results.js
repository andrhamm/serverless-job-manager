import configureContainer from '../../container';

function makeDeliveryLambdaUpdateJobWithExecutionResults({
  getLogger,
  updateJobWithExecutionResults,
}) {
  return async function delivery(inputs) {
    const [
      jobExecutionResult,
      {
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
      },
    ] = inputs;

    const logger = getLogger();
    logger.addContext('guid', guid);
    logger.addContext('jobExecutionName', jobExecutionName);
    logger.addContext('input', inputs);
    logger.debug('start');

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

    return updatedJob;
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaUpdateJobWithExecutionResults);
