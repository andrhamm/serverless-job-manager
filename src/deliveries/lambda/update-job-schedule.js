import configureContainer from '../../container';
import { camelCaseObj } from '../../lib/common';

function makeDeliveryLambdaUpdateJobSchedule({ updateJobSchedule, getLogger }) {
  // eslint-disable-next-line consistent-return
  return async function delivery(input, context, callback) {
    const logger = getLogger();
    // logger.addContext('guid', guid);
    logger.debug(`event: ${JSON.stringify(input)}`);

    // TODO: validate, swagger!
    const {
      pathParameters,
      body: bodyJson,
    } = input;

    const body = JSON.parse(bodyJson);
    const {
      serviceName,
      jobName,
    } = pathParameters;

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

    const statusCode = 400;
    const headers = { 'Content-Type': 'application/json' };

    if (schedule === undefined) {
      return {
        statusCode, headers, body: '{"message":"Missing schedule"}',
      };
    }
    if (invocationType === undefined || !['http'].includes(invocationType)) {
      return {
        statusCode, headers, body: '{"message":"Missing invocation_type"}',
      };
    }
    if (invocationTarget === undefined) {
      return {
        statusCode, headers, body: '{"message":"Missing invocation_target"}',
      };
    }
    exclusive = exclusive === undefined ? true : !!exclusive;
    if (payload === undefined) {
      payload = '{}';
    }

    if (isNaN(parseInt(ttlSeconds, 10))) {
      return {
        statusCode, headers, body: '{"message":"Invalid ttl_seconds"}',
      };
    }
    ttlSeconds = Math.max(parseInt(ttlSeconds || 0, 10), 60);
    enabled = !!enabled;
    async = !!async;
    exclusive = !!exclusive;

    const { ruleArn, ruleName } = await updateJobSchedule({
      jobName,
      schedule,
      serviceName,
    });

    callback(null, {
      async,
      enabled,
      exclusive,
      // guid,
      invocationTarget,
      invocationType,
      jobName,
      payload,
      ruleArn,
      ruleName,
      schedule,
      serviceName,
      ttlSeconds,
    });
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaUpdateJobSchedule);
