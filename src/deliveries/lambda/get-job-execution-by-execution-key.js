import configureContainer from '../../container';

function makeDeliveryLambdaGetJobExecutionByExecutionKey({
  getJobExecutionByExecutionKey,
  getLogger,
}) {
  return async function delivery(input, context, callback) {
    const { jobExecutionKey } = input;

    const logger = getLogger();
    // logger.addContext('guid', guid);
    logger.debug(`event: ${JSON.stringify(input)}`);

    const jobExecution = await getJobExecutionByExecutionKey(jobExecutionKey);

    delete jobExecution.partitionKey;
    delete jobExecution.sortKey;

    const output = { ...input, jobExecution };
    delete output.jobExecutionKey;
    delete output.jobGuid;

    callback(null, output);
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaGetJobExecutionByExecutionKey);
