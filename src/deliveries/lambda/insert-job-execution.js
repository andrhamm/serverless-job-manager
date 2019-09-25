import configureContainer from '../../container';

function makeDeliveryLambdaInsertJobExecution({ insertJobExecution, getLogger }) {
  return async function delivery(input, context, callback) {
    const {
      input: executionInput,
      executionName,
    } = input;

    const {
      jobStatic: {
        guid,
        key: {
          serviceName,
          jobName,
        },
      },
      jobExecution: {
        event: triggerEvent,
      },
    } = executionInput;

    const logger = getLogger();
    logger.addContext('guid', guid);
    logger.addContext('executionName', executionName);
    logger.debug(`event: ${JSON.stringify(input)}`);

    const {
      key: executionKey,
      event: {
        timeMs,
      },
    } = await insertJobExecution(executionName, serviceName, jobName, triggerEvent);

    const output = {
      ...executionInput,
    };

    output.jobExecution.name = executionName;
    output.jobExecution.key = executionKey;
    output.jobExecution.event.timeMs = timeMs;
    delete output.jobExecution.partitionKey;
    delete output.jobExecution.sortKey;

    callback(null, output);
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaInsertJobExecution);
