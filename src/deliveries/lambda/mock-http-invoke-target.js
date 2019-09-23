import configureContainer from '../../container';
import { camelCaseObj } from '../../lib/common';

function makeDeliveryLambdaMockHttpInvokeTarget({ invokeMockDelayedCallback, getLogger }) {
  return async function delivery(input, context, callback) {
    const logger = getLogger();
    logger.debug(`event: ${JSON.stringify(input)}`);

    const {
      body: bodyJson,
    } = input;

    const body = JSON.parse(bodyJson);

    const { callbackUrl } = camelCaseObj(body);

    await invokeMockDelayedCallback(callbackUrl);

    callback(null, {
      statusCode: 204,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaMockHttpInvokeTarget);
