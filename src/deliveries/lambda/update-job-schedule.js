import configureContainer from '../../container';
import { camelCaseObj, requireJson } from '../../lib/common';


function makeDeliveryLambdaUpdateJobSchedule({ updateJobSchedule, getLogger }) {
  // eslint-disable-next-line consistent-return
  return async function delivery(input) {
    const logger = getLogger();
    logger.addContext('input', input);
    logger.debug('start');

    // API Gateway doesn't let you require a specific content-type, so if
    // it is not json, the jsonschema validation will not have been applied
    const notJson = requireJson(input.headers);
    if (notJson) {
      return notJson;
    }

    // TODO: validate w/ jsonschema!
    const {
      pathParameters: {
        serviceName,
        jobName,
      },
      body: bodyJson,
    } = input;

    const body = JSON.parse(bodyJson);

    let {
      invocationType,
      invocationTarget,
      ttlSeconds,
      async,
      enabled,
      exclusive, // each execution must obtain a lock (concurrency=1)
      payload, // static data to send along with the job, template vars in future
      schedule, // the cloudwatch logs schedule expression (cron or rate)
    } = camelCaseObj(body);

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
