import uuidv5 from 'uuid/v5';
import { delay, snakeCaseObj } from '../lib/common';

export const makeMockDelayedServiceExecutionCallback = ({
  getHttpClient,
  getLogger,
}) => async function mockDelayedServiceExecutionCallback(callbackUrl) {
  const client = getHttpClient();
  const logger = getLogger();

  const delayMs = Math.floor(((Math.random() * 5) + 1) * 1000);

  logger.debug(`Invoking callback after ${delayMs}ms: \n${callbackUrl}`);

  await delay(delayMs);

  const correlationId = uuidv5(callbackUrl, uuidv5.URL);
  const success = Math.random() >= 0.5;

  const result = {
    correlationId,
    state: snakeCaseObj({ delayMs }),
    status: success ? 'success' : 'fail',
    summary: success ? 'Success summary text' : 'Error cause description',
    error: success ? null : 'Internal Server Error',
  };

  await client.post(callbackUrl, snakeCaseObj(result));
};
