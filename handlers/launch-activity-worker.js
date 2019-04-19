import { lambda } from '../lib/aws_clients';

const {
  LAMBDA_ARN_POLL_ACTIVITY_TASK_TOKENS
} = process.env;

export const handler = async (input, context, callback) => {
  const { executionName } = input;
  await lambda.invoke({
    FunctionName: LAMBDA_ARN_POLL_ACTIVITY_TASK_TOKENS,
    InvocationType: 'Event', // async / fire and forget
    Payload: JSON.stringify({ executionName }),
  }).promise();

  callback(null, input);
}
