import { lambda } from '../lib/aws_clients';

export const makeInvokeMockDelayedCallback = ({
  lambdaArnMockDelayedCallback,
  // logger,
}) => async function invokeMockDelayedCallback({
  callbackUrl,
  heartbeatIntervalSeconds,
  requestTimeMs,
  ttlSeconds,
}) {
  // logger.debug('test log inside invokeMockDelayedCallback');

  await lambda.invoke({
    FunctionName: lambdaArnMockDelayedCallback,
    InvocationType: 'Event', // async / fire and forget
    Payload: JSON.stringify({
      callbackUrl,
      heartbeatIntervalSeconds,
      requestTimeMs,
      ttlSeconds,
    }),
  }).promise();

  return true;
};
