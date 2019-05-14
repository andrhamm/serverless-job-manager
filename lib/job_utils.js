export function getJobRuleTargetInputTransformer({
  async,
  exclusive,
  guid,
  invocationTarget,
  invocationType,
  jobName,
  payload,
  schedule,
  serviceName,
  sqsMessageGroupId,
  ttlSeconds,
}) {
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
    inputTemplate += `"async": ${async ? 'true' : 'false'},`;
    inputTemplate += `"exclusive": ${exclusive ? 'true' : 'false'},`;
    inputTemplate += `"guid":"${guid}",`;
    inputTemplate += `"invocationTarget":"${invocationTarget}",`;
    inputTemplate += `"invocationType":"${invocationType}",`;
    inputTemplate += `"jobName":"${jobName}",`;
    inputTemplate += `"key":{"jobName":"${jobName}","serviceName":"${serviceName}"},`,
    inputTemplate += `"payload":${JSON.stringify(payload)},`;
    inputTemplate += `"ruleSchedule":"${schedule}",`;
    inputTemplate += `"serviceName":"${serviceName}",`;
    inputTemplate += `"ttlSeconds": ${ttlSeconds}`,
  inputTemplate += `},` // job

  inputTemplate += `"sqs":{`
    inputTemplate += `"messageGroupId":"${sqsMessageGroupId}"`;
  inputTemplate += `}` // sqs

  inputTemplate = `{${inputTemplate}}`;

  console.log(`inputTemplate: ${inputTemplate}`);

  return {
    InputPathsMap: inputPathsMap,
    InputTemplate: inputTemplate,
  };
}
