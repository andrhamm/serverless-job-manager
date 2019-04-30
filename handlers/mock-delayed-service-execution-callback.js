import axios from 'axios';
import uuidv5 from 'uuid/v5';
import { snakeCaseObj, delay } from '../lib/common';

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const { callbackUrl } = input;

  const delayMs = Math.floor((Math.random() * 5 + 1) * 1000);
  console.log(`Invoking callback after ${delayMs}ms: \n${callbackUrl}`);
  await delay(delayMs);

  const correlationId = uuidv5(callbackUrl, uuidv5.URL);

  const success = Math.random() >= 0.5;

  const result = {
    correlationId,
    state: snakeCaseObj({ delayMs }),
    status: success ? 'success' : 'fail',
    summary: success ? "Success summary text" : "Error cause description",
    error: success ? null : "Internal Server Error",
  };

  await axios.post(callbackUrl, snakeCaseObj(result));
}
