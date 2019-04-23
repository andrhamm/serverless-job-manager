import { stepfunctions } from '../lib/aws_clients';

export const handler = async (inputs, context, callback) => {
  console.log('event: ' + JSON.stringify(inputs, null, 2));
  const input = Object.assign({}, ...inputs);

  const {
    job,
    jobExecution: {
      awaitCallbackTaskToken: taskToken
    },
    result,
  } = input;

  const { executionArn } await stepfunctions.sendTaskSuccess({
    taskToken,
    output: JSON.stringify(result),
  }).promise();

  callback(null,  { executionArn });
}
