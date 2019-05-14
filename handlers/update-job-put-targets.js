import { cloudwatchevents } from '../lib/aws_clients';
import { getJobRuleTargetInputTransformer } from '../lib/job_utils';

const {
  IAM_ROLE_ARN_CLOUDWATCH_EVENTS,
  STATE_MACHINE_ARN_QUEUE_JOB_EXECUTION,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    jobName,
    serviceName,
    ruleName,
  } = input;

  const sqsMessageGroupId = `${serviceName}:${jobName}`;

  const params = {
    ...input,
    sqsMessageGroupId,
  };

  const putTargetsResp = await cloudwatchevents.putTargets({
    Rule: ruleName,
    Targets: [
      {
        Id: 'StateMachineQueueJobExecution',
        Arn: STATE_MACHINE_ARN_QUEUE_JOB_EXECUTION,
        RoleArn: IAM_ROLE_ARN_CLOUDWATCH_EVENTS,
        InputTransformer: getJobRuleTargetInputTransformer(params),
      }
    ]
  }).promise();

  console.log(`putTargets response: ` + JSON.stringify(putTargetsResp, null, 2));

  if (putTargetsResp.FailedEntryCount > 0) {
    throw new Error('Failed to putTargets');
  }

  callback(null, params);
};
