import uuidv5 from 'uuid/v5';
import { delay, snakeCaseObj } from '../lib/common';

export const makeMockDelayedServiceExecutionCallback = ({
  callbackHeartbeatIntervalSeconds,
  getHttpClient,
  getLogger,
}) => async function mockDelayedServiceExecutionCallback({
  callbackUrl,
  heartbeatIntervalSeconds: heartbeatIntervalSecondsIn, // 60
  requestTimeMs,
  ttlSeconds, // this simulator works for executions up to 900 seconds
}) {
  const http = getHttpClient();
  const logger = getLogger();

  const doHeartbeat = progress => http(callbackUrl, {
    method: 'post',
    body: JSON.stringify({
      status: 'processing',
      progress,
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const heartbeatIntervalSeconds = heartbeatIntervalSecondsIn || callbackHeartbeatIntervalSeconds;
  const ttlMs = ttlSeconds * 1000;
  const heartbeatIntervalMs = heartbeatIntervalSeconds * 1000;
  // leave enough time to do success/fail callback
  const stopHeartbeatsAtMs = (requestTimeMs + ttlMs) - 10000 - heartbeatIntervalMs;
  const correlationId = uuidv5(callbackUrl, uuidv5.URL);

  logger.addContext('ttlSeconds', ttlSeconds);
  logger.addContext('correlationId', correlationId);
  logger.addContext('callbackUrl', callbackUrl);
  logger.addContext('heartbeatIntervalSeconds', heartbeatIntervalSeconds);

  // first heartbeat should be done basically right away
  let delayMs = Math.floor(((Math.random() * 3) + 1) * 1000);
  let progress = 0;
  let elapsedMs;

  // do a heartbeat every heartbeatIntervalSeconds until ~ttlSeconds have passed
  /* eslint-disable no-await-in-loop */
  do {
    logger.debug(`Invoking heartbeat callback after ${delayMs}ms (${progress}%)...`);

    // TODO: we're paying for idle compute time here... this would be better as a
    // step function with a wait state
    await delay(delayMs);

    elapsedMs = Date.now() - requestTimeMs;
    progress = Math.floor((elapsedMs / ttlMs) * 100);

    const { status, statusText } = await doHeartbeat(progress);

    logger.debug(`Heartbeat callback response: ${status} ${statusText}`);

    if (status >= 300) {
      throw new Error(`Heartbeat failed with status ${status} ${statusText}`);
    }

    // delay before the next callback
    delayMs = Math.floor(heartbeatIntervalMs / 5);
  } while (Date.now() < stopHeartbeatsAtMs);
  /* eslint-enable no-await-in-loop */

  logger.debug(`Invoking final callback after ${delayMs}ms`);

  await delay(delayMs);

  const success = Math.random() >= 0.5;

  const mockResult = snakeCaseObj({
    correlationId,
    state: JSON.stringify(snakeCaseObj({ delayMs })),
    status: success ? 'success' : 'fail',
    summary: success ? 'Success summary text' : 'Error cause description',
    error: success ? undefined : 'Internal Server Error',
  });

  logger.addContext('finalCallbackRequestBody', mockResult);

  logger.debug(`Delay complete, posting mock ${success ? 'success' : 'failure'}`);

  const res = await http(callbackUrl, {
    method: 'post',
    body: JSON.stringify(mockResult),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const { status, statusText } = res;
  const body = await res.text();

  logger.addContext('callbackresponse', {
    status,
    statusText,
    body,
  });
  logger.debug('Mock callback complete');

  if (status >= 300) {
    throw new Error(`Callback failed with status ${status} ${statusText}`);
  }

  return true;
};
