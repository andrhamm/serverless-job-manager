import { cloudwatchevents } from '../lib/aws_clients';
import { getJobRuleTargetInputTransformer } from '../lib/job_utils';

export const makeUpdateJobScheduleTargets = ({
  getLogger,
  iamRoleArnCloudwatchEvents,
  stateMachineArnExecuteJob,
}) => async function updateJobScheduleTargets(ruleName, jobStatic) {
  const { guid } = jobStatic;

  const logger = getLogger();
  logger.addContext('guid', guid);

  const putTargetsResp = await cloudwatchevents.putTargets({
    Rule: ruleName,
    Targets: [
      {
        Id: 'StateMachineQueueJobExecution',
        Arn: stateMachineArnExecuteJob,
        RoleArn: iamRoleArnCloudwatchEvents,
        InputTransformer: getJobRuleTargetInputTransformer(jobStatic),
      },
    ],
  }).promise();

  logger.debug(`putTargets response: ${JSON.stringify(putTargetsResp)}`);

  if (putTargetsResp.FailedEntryCount > 0) {
    throw new Error('Failed to putTargets');
  }

  return true;
};
