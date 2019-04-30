import { lambda } from '../../lib/aws_clients';
import { camelCaseObj } from '../../lib/common';

const {
  LAMBDA_ARN_MOCK_DELAYED_CALLBACK,
} = process.env;

export const handler = async (input, context, callback) => {
  const {
    pathParameters,
    body: bodyJson
  } = input;

  console.log(`event body: ${bodyJson}`);

  const body = JSON.parse(bodyJson);

  const { callbackUrl } = camelCaseObj(body);

  await lambda.invoke({
    FunctionName: LAMBDA_ARN_MOCK_DELAYED_CALLBACK,
    InvocationType: 'Event', // async / fire and forget
    Payload: JSON.stringify({ callbackUrl }),
  }).promise();

  callback(null,  {
    statusCode: 204,
    headers: {
      'Content-Type': 'application/json'
    },
  });
}
