import { cloudwatchevents, dynamodbUnmarshall } from '../lib/aws_clients';

const {
  CLOUDWATCH_EVENTS_RULE_PREFIX,
  IAM_ROLE_ARN_CLOUDWATCH_EVENTS,
  SERVICE_NAME,
  STATE_MACHINE_ARN_QUEUE_JOB_EXECUTION,
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

  const listRulesResp = await cloudwatchevents.listRules({
    NamePrefix: ruleName,
  }).promise();

  console.log(`listRulesResp response: ` + JSON.stringify(listRulesResp, null, 2));

  const existingRule = listRulesResp.Rules.find(r => r.Name === ruleName);

  if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
    let putResp;
    try {
      putResp = await cloudwatchevents.putRule({
        Name: ruleName,
        Description: `Schedule for ${SERVICE_NAME} ${serviceName} ${jobName}`,
        ScheduleExpression: newImage.schedule,
        State: newImage.enabled ? 'ENABLED' : 'DISABLED',
      }).promise();
    } catch (e) {
      console.log(`FAILED to create rule ${ruleName}! ${e.message}`);
      return;
    }

    const inputPathsMap = {
      // can define a max of 10 of these...
      id: "$.id",
      time: "$.time",
      account: "$.account",
      region: "$.region",
      ruleArn: "$.resources[0]",
    };

    const eventParts = Object.keys(inputPathsMap).reduce((parts, key) => {
      parts.push(`"${key}":<${key}>`);
      return parts;
    }, []);

    let inputTemplate = `"jobExecution":{"event":{${eventParts.join(',')}}},`;

    inputTemplate += `"jobStatic":{`
      inputTemplate += `"async": ${newImage.async ? 'true' : 'false'},`;
      inputTemplate += `"exclusive": ${newImage.exclusive ? 'true' : 'false'},`;
      inputTemplate += `"guid":"${jobGuid}",`;
      inputTemplate += `"invocationTarget":"${newImage.invocationTarget}",`;
      inputTemplate += `"invocationType":"${newImage.invocationType}",`;
      inputTemplate += `"jobName":"${jobName}",`;
      inputTemplate += `"key":{"jobName":"${jobName}","serviceName":"${serviceName}"},`,
      inputTemplate += `"payload":${JSON.stringify(newImage.payload)},`;
      inputTemplate += `"ruleName":"${ruleName}",`;
      inputTemplate += `"ruleSchedule":"${newImage.schedule}",`;
      inputTemplate += `"serviceName":"${serviceName}",`;
      inputTemplate += `"ttlSeconds": ${newImage.ttlSeconds}`,
    inputTemplate += `},` // job

    inputTemplate += `"sqs":{`
      inputTemplate += `"messageGroupId":"${sqsMessageGroupId}"`;
    inputTemplate += `}` // sqs

    inputTemplate = `{${inputTemplate}}`;

    console.log(`inputTemplate: ${inputTemplate}`);

    const putTargetsResp = await cloudwatchevents.putTargets({
      Rule: ruleName,
      Targets: [
        {
          Id: targetId,
          Arn: STATE_MACHINE_ARN_QUEUE_JOB_EXECUTION,
          RoleArn: IAM_ROLE_ARN_CLOUDWATCH_EVENTS,
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
