import { lambda } from '../lib/aws_clients';

export const makeInvokeMockDelayedCallback = ({
  lambdaArnMockDelayedCallback,
}) => async function invokeMockDelayedCallback(callbackUrl) {
  await lambda.invoke({
    FunctionName: lambdaArnMockDelayedCallback,
    InvocationType: 'Event', // async / fire and forget
    Payload: JSON.stringify({ callbackUrl }),
  }).promise();

  return true;
};
