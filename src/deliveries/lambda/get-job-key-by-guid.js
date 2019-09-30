import configureContainer from '../../container';

function makeDeliveryLambdaGetJobKeyByGuid({ getJobKeyByGuid, getLogger }) {
  return async function delivery(input) {
    const { jobGuid } = input;

    const logger = getLogger();
    logger.addContext('guid', jobGuid);
    logger.debug(`event: ${JSON.stringify(input)}`);

    const jobKey = await getJobKeyByGuid(jobGuid);

    return {
      jobStatic: {
        key: jobKey,
      },
    };
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaGetJobKeyByGuid);
