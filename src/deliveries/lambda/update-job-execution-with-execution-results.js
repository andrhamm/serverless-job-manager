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
    logger.debug(`event: ${JSON.stringify(inputs)}`);

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
