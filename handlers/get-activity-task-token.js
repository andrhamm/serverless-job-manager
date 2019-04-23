import { dynamodb, stepfunctions, dynamodbMarshall, dynamodbUnmarshall } from '../lib/aws_clients';

const {
  STEP_FUNCTION_ACTIVITY_ARN_AWAIT_CALLBACK,
} = process.env;

export const handler = async (input, context, callback) => {
  const {
    jobExecution: {
      key: executionKey,
      name: executionName,
    },
  } = input;

  const output = { ...input };

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
      jobExecution: {
        key: activityExecutionKey,
        name: activityExecutionName,
      },
    } = activityInput;

    const match = activityExecutionName && activityExecutionName === executionName;

    output.awaitCallbackActivity = {
      taskToken,
      jobExecutionKey: activityExecutionKey,
    };

    if (match) {
      console.log(`Received taskToken for the invoking execution`);
      output.jobExecution.awaitCallbackTaskToken = taskToken;
    }
  }

  callback(null, output);
}
