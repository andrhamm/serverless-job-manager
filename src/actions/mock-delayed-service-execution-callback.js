import uuidv5 from 'uuid/v5';
import { delay, snakeCaseObj } from '../lib/common';

export const makeMockDelayedServiceExecutionCallback = ({
  getHttpClient,
  getLogger,
}) => async function mockDelayedServiceExecutionCallback(callbackUrl) {
  const client = getHttpClient();
  const logger = getLogger();

  const delayMs = Math.floor(((Math.random() * 3) + 1) * 1000);

  logger.debug(`Invoking callback after ${delayMs}ms: \n${callbackUrl}`);

  await delay(delayMs);

  const correlationId = uuidv5(callbackUrl, uuidv5.URL);
  const success = Math.random() >= 0.5;

  const result = snakeCaseObj({
    correlationId,
    state: snakeCaseObj({ delayMs }),
    status: success ? 'success' : 'fail',
    summary: success ? 'Success summary text' : 'Error cause description',
    error: success ? null : 'Internal Server Error',
  });

  logger.debug(`Delay complete, posting mock ${success ? 'success' : 'failure'} correlationId=${correlationId}\n${JSON.stringify(result)}`);

  const { status, data } = await client.post(callbackUrl, result, { validateStatus: false });

  logger.debug(`Mock post response (${status}: ${JSON.stringify(data)}`);

  return true;
};
