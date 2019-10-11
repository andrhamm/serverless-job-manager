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
  const stopHeartbeatsAtMs = (requestTimeMs + (ttlMs * 0.9)) - heartbeatIntervalMs;

  logger.addContext('heartbeatIntervalSeconds', heartbeatIntervalSeconds);

  // first heartbeat should be done basically right away
  let delayMs = Math.floor(((Math.random() * 3) + 1) * 1000);
  let progress;
  let elapsedMs;

  // do a heartbeat every heartbeatIntervalSeconds until ~ttlSeconds have passed
  /* eslint-disable no-await-in-loop */
  do {
    elapsedMs = Date.now() - requestTimeMs;
    progress = Math.floor((elapsedMs / ttlMs) * 100);

    logger.debug(`Invoking heartbeat callback after ${delayMs}ms (${progress}%)...`);

    // TODO: we're paying for idle compute time here... this would be better as a
    // step function with a wait state
    await delay(delayMs);

    await doHeartbeat(progress);

    delayMs = heartbeatIntervalMs;
  } while (Date.now() < stopHeartbeatsAtMs);
  /* eslint-enable no-await-in-loop */

  await delay(delayMs);

  logger.debug(`Invoking final callback after ${delayMs}ms: \n${callbackUrl}`);

  await delay(delayMs);

  const correlationId = uuidv5(callbackUrl, uuidv5.URL);
  const success = Math.random() >= 0.5;

  const resultJson = JSON.stringify(snakeCaseObj({
    correlationId,
    state: JSON.stringify(snakeCaseObj({ delayMs })),
    status: success ? 'success' : 'fail',
    summary: success ? 'Success summary text' : 'Error cause description',
    error: success ? undefined : 'Internal Server Error',
  }));

  logger.debug(`Delay complete, posting mock ${success ? 'success' : 'failure'} correlationId=${correlationId}\n${resultJson}`);

  const res = await http(callbackUrl, {
    method: 'post',
    body: resultJson,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const { status, statusText } = res;
  const body = await res.text();

  logger.debug(`Mock post response (${status} ${statusText}): ${body}`);

  return true;
};
