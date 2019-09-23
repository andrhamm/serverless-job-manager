import configureContainer from '../../container';

function makeDeliveryLambdaGetJobLock({ lockJobByKey, getLogger }) {
  return async function delivery(input, context, callback) {
    const {
      input: executionInput,
      executionName,
    } = input;

    const {
      jobStatic: {
        guid,
        key: jobKey,
      },
    } = executionInput;

    const logger = getLogger();
    logger.addContext('guid', guid);
    logger.debug(`event: ${JSON.stringify(input)}`);

    const job = await lockJobByKey(jobKey, executionName);

    callback(null, {
      ...input,
      ...job,
    });
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaGetJobLock);
