import axios from 'axios';
import { camelCaseObj } from '../../lib/common';

// const delay = delayMs => new Promise(resolve => setTimeout(resolve, delayMs));

export const handler = async (input, context, callback) => {
  // console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    pathParameters,
    body: bodyJson
  } = input;

  console.log(`event body: ${bodyJson}`);

  const body = JSON.parse(bodyJson);

  const {
    callbackUrl,
  } = camelCaseObj(body);

  // console.log(`Invoking callback after 2 seconds: ${callbackUrl}`);
  //
  // await delay(2000)

  const resp = await axios.post(callbackUrl, {});

  console.log(JSON.stringify(resp.data));

  callback(null,  {
    statusCode: 202,
    headers: {
      'Content-Type': 'application/json'
    },
    body: bodyJson,
  });
}
