import configureContainer from '../../container';
import { camelCaseObj } from '../../lib/common';

const contentType = 'application/json';

function makeDeliveryLambdaUpdateJobSchedule({ updateJobSchedule, getLogger }) {
  // eslint-disable-next-line consistent-return
  return async function delivery(input) {
    const logger = getLogger();
    // logger.addContext('guid', guid);
    logger.debug(`event: ${JSON.stringify(input)}`);

    // API Gateway doesn't let you require a specific content-type, so if
    // it is not json, the jsonschema validation will not have been applied
    if (!Object.entries(input.headers).find(([k, v]) => (
      k.toLowerCase() === 'content-type' && v.startsWith(contentType)
    ))) {
      return {
        statusCode: 415,
        headers: { 'Content-Type': contentType },
        body: `{"message":"Invalid content-type. Must begin with \\"${contentType}\\""}`,
      };
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
