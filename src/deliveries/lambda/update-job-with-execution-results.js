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
          event: {
            time: eventTime,
          },
          name: jobExecutionName,
          serviceInvokedAt,
        },
      },
    ] = inputs;

    const logger = getLogger();
    logger.addContext('guid', guid);
    logger.addContext('jobExecutionName', jobExecutionName);
    logger.addContext('input', inputs);
    logger.debug('start');

    if (!exclusive) {
      return {};
    }

    const updatedJob = await updateJobWithExecutionResults({
      eventTime,
      jobExecutionName,
      jobExecutionResult,
      jobKey,
      serviceInvokedAt,
    });

    return updatedJob;
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaUpdateJobWithExecutionResults);
