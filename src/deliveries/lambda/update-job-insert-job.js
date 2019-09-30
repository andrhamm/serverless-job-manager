import configureContainer from '../../container';

function makeDeliveryLambdaUpdateJobInsertJob({ insertJob, getLogger }) {
  return async function delivery(input) {
    const {
      async,
      enabled,
      exclusive,
      guid,
      invocationTarget,
      invocationType,
      jobName,
      payload,
      schedule,
      serviceName,
      ttlSeconds,
    } = input;

    const logger = getLogger();
    logger.addContext('guid', guid);
    logger.debug(`event: ${JSON.stringify(input)}`);

    const job = {
      async,
      enabled,
      exclusive,
      guid,
      invocationTarget,
      invocationType,
      jobName,
      payload,
      schedule,
      serviceName,
      ttlSeconds,
    };

    const insertedJob = await insertJob(job);

    return insertedJob;
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaUpdateJobInsertJob);
