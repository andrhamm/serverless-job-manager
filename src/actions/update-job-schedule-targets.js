import { cloudwatchevents } from '../lib/aws_clients';

function getJobRuleTargetInputTransformer({
  async,
  exclusive,
  guid,
  invocationTarget,
  invocationType,
  jobName,
  payload,
  schedule,
  serviceName,
  ttlSeconds,
}) {
  const inputPathsMap = {
    // can define a max of 10 of these...
    id: '$.id',
    time: '$.time',
    account: '$.account',
    region: '$.region',
    ruleArn: '$.resources[0]',
  };

  const eventParts = Object.keys(inputPathsMap).reduce((parts, key) => {
    parts.push(`"${key}":<${key}>`);
    return parts;
  }, []);

  let inputTemplate = `"jobExecution":{"event":{${eventParts.join(',')}}},`;

  inputTemplate += '"jobStatic":{';
  inputTemplate += `"async": ${async ? 'true' : 'false'},`;
  inputTemplate += `"exclusive": ${exclusive ? 'true' : 'false'},`;
  inputTemplate += `"guid":"${guid}",`;
  inputTemplate += `"invocationTarget":"${invocationTarget}",`;
  inputTemplate += `"invocationType":"${invocationType}",`;
  inputTemplate += `"jobName":"${jobName}",`;
  inputTemplate += `"key":{"jobName":"${jobName}","serviceName":"${serviceName}"},`;
  inputTemplate += `"payload":${JSON.stringify(payload)},`;
  inputTemplate += `"ruleSchedule":"${schedule}",`;
  inputTemplate += `"serviceName":"${serviceName}",`;
  inputTemplate += `"ttlSeconds": ${ttlSeconds}`;
  inputTemplate += '}'; // job

  inputTemplate = `{${inputTemplate}}`;

  return {
    InputPathsMap: inputPathsMap,
    InputTemplate: inputTemplate,
  };
}


export const makeUpdateJobScheduleTargets = ({
  getLogger,
  iamRoleArnCloudwatchEvents,
  stateMachineArnExecuteJob,
}) => async function updateJobScheduleTargets(ruleName, jobStatic) {
  const { guid } = jobStatic;

  const logger = getLogger();
  logger.addContext('guid', guid);

  const inputTemplate = getJobRuleTargetInputTransformer(jobStatic);

  logger.debug(`InputTransformer: ${JSON.stringify(inputTemplate)}`);

  const putTargetsResp = await cloudwatchevents.putTargets({
    Rule: ruleName,
    Targets: [
      {
        Id: 'StateMachineQueueJobExecution',
        Arn: stateMachineArnExecuteJob,
        RoleArn: iamRoleArnCloudwatchEvents,
        InputTransformer: inputTemplate,
      },
    ],
  }).promise();

  logger.debug(`putTargets response: ${JSON.stringify(putTargetsResp)}`);

  if (putTargetsResp.FailedEntryCount > 0) {
    throw new Error('Failed to putTargets');
  }

  return true;
};
