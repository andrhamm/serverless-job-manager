import configureContainer from '../../container';

function makeDeliveryLambdaGetJobExecutionByExecutionKey({
  getJobExecutionByExecutionKey,
  getLogger,
}) {
  return async function delivery(input) {
    const { jobExecutionKey } = input;

    const logger = getLogger();
    logger.addContext('input', input);
    logger.debug('start');

    const jobExecution = await getJobExecutionByExecutionKey(jobExecutionKey);

    delete jobExecution.partitionKey;
    delete jobExecution.sortKey;

    const output = { ...input, jobExecution };
    delete output.jobExecutionKey;
    delete output.jobGuid;

    return output;
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaGetJobExecutionByExecutionKey);
