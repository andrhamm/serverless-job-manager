import uuidv5 from 'uuid/v5';
import { cloudwatchevents } from '../lib/aws_clients';
import { camelCaseObj } from '../lib/common';
import CustomError from '../lib/errors';

const {
  CLOUDWATCH_EVENTS_RULE_PREFIX,
  SERVICE_NAME,
} = process.env;

// function BadRequestInvalidScheduleError(message) {
//     this.name = "BadRequestInvalidScheduleError";
//     this.message = message;
//     this.stack = [ "statusCode=400" ];
// }
// BadRequestInvalidScheduleError.prototype = new Error();

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  // TODO: validate, swagger!
  const {
    pathParameters,
    body: bodyJson
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

  let statusCode = 400;
  let headers = {'Content-Type': 'application/json'};

  if (schedule === undefined) {
    return {
      statusCode, headers, body: `{"message":"Missing schedule"}`,
    };
  }
  if (invocationType === undefined || !['http'].includes(invocationType)) {
    return {
      statusCode, headers, body: `{"message":"Missing invocation_type"}`,
    };
  }
  if (invocationTarget === undefined) {
    return {
      statusCode, headers, body: `{"message":"Missing invocation_target"}`,
    };
  }
  exclusive = exclusive === undefined ? true : !!exclusive;
  if (payload === undefined) {
    payload = "{}";
  }

  if (isNaN(parseInt(ttlSeconds))) {
    return {
      statusCode, headers, body: `{"message":"Invalid ttl_seconds"}`,
    };
  } else {
    ttlSeconds = Math.max(parseInt(ttlSeconds || 0), 60);
  }

  enabled = !!enabled;
  async = !!async;
  exclusive = !!exclusive;

  // deterministic uuid
  const guid = uuidv5([serviceName, jobName].join('--'), uuidv5.URL);
  const ruleName = `${CLOUDWATCH_EVENTS_RULE_PREFIX}${guid}`;

  let ruleArn;
  try {
    ({ RuleArn: ruleArn } = await cloudwatchevents.putRule({
      Description: `Schedule for ${SERVICE_NAME} ${serviceName} ${jobName}`,
      Name: ruleName,
      ScheduleExpression: schedule,
      State: enabled ? 'ENABLED' : 'DISABLED',
    }).promise());
  } catch (e) {
    console.log(e);
    if (e.code && e.code === 'ValidationException' && e.message.includes('Parameter ScheduleExpression is not valid')) {
      // const error = new BadRequestInvalidScheduleError("Schedule is not a valid schedule expression");
      const error = new CustomError("Schedule is not a valid schedule expression", {statusCode: 400, code: 'InvalidSchedule'});
      callback(error);
      return;
    }

    throw e;
  }

  callback(null, {
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
  });
};
