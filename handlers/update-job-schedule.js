import { cloudwatchevents, dynamodbUnmarshall } from '../lib/aws_clients';

const {
  // LAMBDA_ARN_START_EXECUTION_WITH_EVENT,
  // STATE_MACHINE_ARN_EXECUTE_JOB,
  CLOUDWATCH_EVENTS_RULE_PREFIX,
  IAM_ROLE_ARN_CLOUDWATCH_EVENTS,
  SERVICE_NAME,
  STATE_MACHINE_ARN_QUEUE_JOB_EXECUTION,
  // SQS_QUEUE_ARN_JOB_EXECUTION_EVENTS,
} = process.env;

// TODO: make this a step function!
export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    Records: {
      [0]: record
    }
  } = input;

  const {
    dynamodb: {
      Keys: jobKeyMarshalled,
      NewImage: newImageMarshalled,
      OldImage: oldImageMarshalled,
    },
  } = record;

  const jobKey = dynamodbUnmarshall(jobKeyMarshalled);
  const newImage = newImageMarshalled ? dynamodbUnmarshall(newImageMarshalled) : {};
  const oldImage = oldImageMarshalled ? dynamodbUnmarshall(oldImageMarshalled) : {};

  const {
    serviceName,
    jobName,
  } = jobKey;

  const jobGuid = newImage.guid || oldImage.guid;
  const sqsMessageGroupId = `${serviceName}:${jobName}`;

  const ruleName = `${CLOUDWATCH_EVENTS_RULE_PREFIX}${jobGuid}`;
  const targetId = 'StateMachineQueueJobExecution';
  // const targetId = 'StateMachineExecuteJobExecution';
  // const targetId = 'LambdaFunctionStartJobExecution';
  // const targetId = 'SqsFifoQueueJobExecutionEvents';

  const listRulesResp = await cloudwatchevents.listRules({
    NamePrefix: ruleName,
  }).promise();

  console.log(`listRulesResp response: ` + JSON.stringify(listRulesResp, null, 2));

  const existingRule = listRulesResp.Rules.find(r => r.Name === ruleName);

  // const listTargestsResp = await cloudwatchevents.listTargetsByRule({
  //   Rule: ruleName,
  // }).promise();
  //
  // console.log(`listTargestsResp response: ` + JSON.stringify(listTargestsResp, null, 2));

  if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
    let putResp;
    try {
      putResp = await cloudwatchevents.putRule({
        Name: ruleName,
        Description: `Schedule for ${SERVICE_NAME} ${serviceName} ${jobName}`,
        // RoleArn: IAM_ROLE_ARN_CLOUDWATCH_EVENTS, // TODO: verify if this is needed... ??
        ScheduleExpression: newImage.schedule,
        State: newImage.enabled ? 'ENABLED' : 'DISABLED',
      }).promise();
    } catch (e) {
      console.log(`FAILED to create rule ${ruleName}! ${e.message}`);
      return;
    }

    const inputPathsMap = {
      // can define a max of 10 of these...
      eventId: "$.id",
      eventTime: "$.time",
      eventAccount: "$.account",
      eventRegion: "$.region",
      ruleArn: "$.resources[0]",
    };

    let inputTemplate = Object.keys(inputPathsMap).reduce((template, key) => {
      return `${template}"${key}":<${key}>,`;
    }, "");

    inputTemplate += `"ruleName":"${ruleName}",`;
    inputTemplate += `"ruleSchedule":"${newImage.schedule}",`;
    inputTemplate += `"invocationType":"${newImage.invocationType}",`;
    inputTemplate += `"invocationTarget":"${newImage.invocationTarget}",`;
    inputTemplate += `"ttlSeconds": ${newImage.ttlSeconds},`
    inputTemplate += `"exclusive": ${newImage.exclusive ? 'true' : 'false'},`;
    inputTemplate += `"async": ${newImage.async ? 'true' : 'false'},`;
    inputTemplate += `"jobName":"${jobName}",`;
    inputTemplate += `"serviceName":"${serviceName}",`;
    inputTemplate += `"sqsMessageGroupId":"${sqsMessageGroupId}",`;
    inputTemplate += `"jobGuid":"${jobGuid}",`;
    inputTemplate += `"payload":${JSON.stringify(newImage.payload)}`;
    inputTemplate = `{${inputTemplate}}`;

    console.log(`inputTemplate: ${inputTemplate}`);

    const putTargetsResp = await cloudwatchevents.putTargets({
      Rule: ruleName,
      Targets: [
        {
          Id: targetId,
          Arn: STATE_MACHINE_ARN_QUEUE_JOB_EXECUTION,
          // Arn: STATE_MACHINE_ARN_QUEUE_JOB,
          // Arn: LAMBDA_ARN_START_EXECUTION_WITH_EVENT,
          // Arn: SQS_QUEUE_ARN_JOB_EXECUTION_EVENTS,
          RoleArn: IAM_ROLE_ARN_CLOUDWATCH_EVENTS,
          // SqsParameters: {
          //   MessageGroupId: sqsMessageGroupId
          // },
          InputTransformer: {
            InputPathsMap: inputPathsMap,
            InputTemplate: inputTemplate,
          },
        }
      ]
    }).promise();

    console.log(`putTargets response: ` + JSON.stringify(putTargetsResp, null, 2));
  } else if (existingRule && record.eventName === 'REMOVE') {
    const removeTargetsResp = await cloudwatchevents.removeTargets({
      Ids: [ targetId ],
      Rule: ruleName,
    }).promise();

    console.log(`removeTargets response: ` + JSON.stringify(removeTargetsResp, null, 2));

    const deleteRuleResp = await cloudwatchevents.deleteRule({
      Name: ruleName
    }).promise();

    console.log(`deleteRule response: ` + JSON.stringify(deleteRuleResp, null, 2));
  }
};
