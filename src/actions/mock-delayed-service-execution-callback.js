import uuidv5 from 'uuid/v5';
import { delay, snakeCaseObj } from '../lib/common';

export const makeMockDelayedServiceExecutionCallback = ({
  getHttpClient,
  getLogger,
}) => async function mockDelayedServiceExecutionCallback(callbackUrl) {
  const http = getHttpClient();
  const logger = getLogger();

  const delayMs = Math.floor(((Math.random() * 3) + 1) * 1000);

  logger.debug(`Invoking callback after ${delayMs}ms: \n${callbackUrl}`);

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
