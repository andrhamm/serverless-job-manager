import configureContainer from '../../container';

function makeDeliveryLambdaUpdateJobExecutionWithExecutionResults({
  updateJobExecutionWithExecutionResults,
  getLogger,
}) {
  return async function delivery(inputs, context, callback) {
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

    callback(null, updatedJobExecution);
  };
}

export const delivery = configureContainer().build(
  makeDeliveryLambdaUpdateJobExecutionWithExecutionResults,
);
