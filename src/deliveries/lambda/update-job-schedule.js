import configureContainer from '../../container';

function makeDeliveryLambdaUpdateJobSchedule({
  updateJobSchedule,
  getLogger,
}) {
  // eslint-disable-next-line consistent-return
  return async function delivery(input) {
    const logger = getLogger();
    logger.addContext('input', input);
    logger.debug('start');

    let {
      jobPreferences: {
        async,
        enabled,
        exclusive, // each execution must obtain a lock (concurrency=1)
        invocationTarget,
        invocationType,
        jobName,
        payload, // static data to send along with the job, template vars in future
        schedule, // the cloudwatch logs schedule expression (cron or rate)
        serviceName,
        ttlSeconds,
      },
    } = input;

    ttlSeconds = Math.max(parseInt(ttlSeconds || 0, 10), 60);
    enabled = !!enabled;
    async = !!async;
    exclusive = !!exclusive;

    const {
      guid,
      ruleArn,
      ruleName,
    } = await updateJobSchedule({
      enabled,
      jobName,
      schedule,
      serviceName,
    });

    return {
      async,
      enabled,
      exclusive,
      guid,
      invocationTarget,
      invocationType,
      jobName,
      payload,
      ruleArn,
      ruleName,
      schedule,
      serviceName,
      ttlSeconds,
    };
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaUpdateJobSchedule);
