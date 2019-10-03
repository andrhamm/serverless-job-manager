import { lambda } from '../lib/aws_clients';

export const makeInvokeMockDelayedCallback = ({
  lambdaArnMockDelayedCallback,
  // logger,
}) => async function invokeMockDelayedCallback(callbackUrl) {
  // logger.debug('test log inside invokeMockDelayedCallback');

  await lambda.invoke({
    FunctionName: lambdaArnMockDelayedCallback,
    InvocationType: 'Event', // async / fire and forget
    Payload: JSON.stringify({ callbackUrl }),
  }).promise();

  return true;
};
