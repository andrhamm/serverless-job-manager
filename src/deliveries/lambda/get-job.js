import configureContainer from '../../container';

function makeDeliveryLambdaGetJob({ getJobByKey, getLogger }) {
  return async function delivery(input, context, callback) {
    const {
      jobStatic: {
        guid,
        key: jobKey,
      },
    } = input;

    const logger = getLogger();
    logger.addContext('guid', guid);
    logger.debug(`event: ${JSON.stringify(input)}`);

    const job = await getJobByKey(jobKey);

    callback(null, {
      ...input,
      ...job,
    });
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaGetJob);