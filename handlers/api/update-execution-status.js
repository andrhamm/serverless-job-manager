import { stepfunctions } from '../../lib/aws_clients';
import { snakeCaseObj } from '../../lib/common';

export const handler = async (inputs, context, callback) => {
  console.log('event: ' + JSON.stringify(inputs, null, 2));
  const input = Object.assign({}, ...inputs);

  const {
    job,
    jobExecution: {
      callbackTaskToken: taskToken
    },
  } = input;

  await stepfunctions.sendTaskSuccess({
    taskToken,
    output: JSON.stringify({foo: 'bar'}),
  }).promise();

  callback(null,  {
    statusCode: 204,
    headers: {
      'Content-Type': 'application/json'
    },
  });
}
