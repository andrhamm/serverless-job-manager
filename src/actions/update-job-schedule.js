import uuidv5 from 'uuid/v5';
import { cloudwatchevents } from '../lib/aws_clients';
import CustomError from '../lib/errors';

// function BadRequestInvalidScheduleError(message) {
//     this.name = "BadRequestInvalidScheduleError";
//     this.message = message;
//     this.stack = [ "statusCode=400" ];
// }
// BadRequestInvalidScheduleError.prototype = new Error();

export const makeUpdateJobSchedule = ({
  cloudwatchEventsRulePrefix,
  stackName,
  getLogger,
}) => async function updateJobSchedule({
  jobName,
  schedule,
  serviceName,
  enabled,
}) {
  // deterministic uuid
  const guid = uuidv5([serviceName, jobName].join('--'), uuidv5.URL);
  const ruleName = `${cloudwatchEventsRulePrefix}${guid}`;

  const logger = getLogger();
  logger.addContext('guid', guid);
  logger.addContext('scheduleRuleName', ruleName);

  let ruleArn;
  try {
    ({ RuleArn: ruleArn } = await cloudwatchevents.putRule({
      Description: `Schedule for ${stackName} ${serviceName} ${jobName}`,
      Name: ruleName,
      ScheduleExpression: schedule,
      State: enabled ? 'ENABLED' : 'DISABLED',
    }).promise());
  } catch (e) {
    logger.error(e);

    if (e.code && e.code === 'ValidationException' && e.message.includes('Parameter ScheduleExpression is not valid')) {
      // const error = new BadRequestInvalidScheduleError(
      // "Schedule is not a valid schedule expression");
      const error = new CustomError('Schedule is not a valid schedule expression', { statusCode: 400, code: 'InvalidSchedule' });
      throw error;
    }

    throw e;
  }

  return {
    ruleArn,
    ruleName,
  };
};
