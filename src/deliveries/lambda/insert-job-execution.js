import configureContainer from '../../container';

function makeDeliveryLambdaInsertJobExecution({ insertJobExecution, getLogger }) {
  return async function delivery(input) {
    const logger = getLogger();

    const {
      executionInput,
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

    logger.addContext('guid', guid);
    logger.addContext('executionName', executionName);
    logger.addContext('input', input);
    logger.debug('start');

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

    logger.addContext('output', output);
    logger.debug('end');

    return output;
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaInsertJobExecution);
