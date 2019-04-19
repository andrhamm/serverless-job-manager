import { dynamodb, stepfunctions, dynamodbMarshall, dynamodbUnmarshall } from '../lib/aws_clients';

const {
  STEP_FUNCTION_ACTIVITY_ARN_AWAIT_CALLBACK,
} = process.env;

export const handler = async (input, context, callback) => {
  const startedAt = Date.now();

  const {
    executionKey,
    executionName,
  } = input;

  const target = {
    executionKey,
    executionName,
  };

  let activity;

  let loop = true;

  // Note: this request is a long poll that lasts up to 60 seconds
  const {
    taskToken,
    input: activityInputJSON,
  } = await stepfunctions.getActivityTask({
    activityArn: STEP_FUNCTION_ACTIVITY_ARN_AWAIT_CALLBACK,
    // not strictly necessary, potentially useful to track worker context
    workerName: executionName,
  }).promise();

  // taskToken can be null if no activity was found
  if (taskToken) {
    const activityInput = JSON.parse(activityInputJSON);

    console.log(`Received activity task with input: ${JSON.stringify(activityInput, null, 2)}`);

    const {
      executionKey: activityExecutionKey,
      executionName: activityExecutionName
    } = activityInput;

    activity = {
      taskToken,
      executionKey: activityExecutionKey,
    };

    const match = activityExecutionName && activityExecutionName === executionName;

    if (match) {
      console.log(`Received taskToken for the invoking execution`);
      loop = false;
    }
  }

  callback(null, {
    target,
    activity,
    loop,
  });
}
