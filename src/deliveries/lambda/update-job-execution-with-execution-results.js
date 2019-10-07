import configureContainer from '../../container';

function makeDeliveryLambdaUpdateJobExecutionWithExecutionResults({
  updateJobExecutionWithExecutionResults,
  getLogger,
}) {
  return async function delivery(inputs) {
    const input = Object.assign({}, ...inputs);

    const {
      jobStatic,
      jobExecution: {
        key: jobExecutionKey,
        serviceInvokedAt,
      },
      jobExecutionResult,
    } = input;

    const logger = getLogger();
    logger.addContext('guid', jobStatic.guid);
    logger.addContext('input', inputs);
    logger.debug('start');

    // tolerate passing objects for this property but convert to string
    if (jobExecutionResult.error && !(typeof jobExecutionResult.error === 'string' || jobExecutionResult.error instanceof String)) {
      jobExecutionResult.error = JSON.stringify(jobExecutionResult.error);
    }

    const updatedJobExecution = await updateJobExecutionWithExecutionResults(
      jobExecutionKey,
      serviceInvokedAt,
      jobStatic,
      jobExecutionResult,
    );

    return updatedJobExecution;
  };
}

export const delivery = configureContainer().build(
  makeDeliveryLambdaUpdateJobExecutionWithExecutionResults,
);
