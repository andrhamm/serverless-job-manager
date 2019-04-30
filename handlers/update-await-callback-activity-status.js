import { stepfunctions } from '../lib/aws_clients';

export const handler = async (inputs, context, callback) => {
  console.log('event: ' + JSON.stringify(inputs, null, 2));
  const input = Object.assign({}, ...inputs);

  const {
    job,
    jobExecution: {
      awaitCallbackTaskToken: taskToken
    },
    jobExecutionResult,
  } = input;

  let method;
  let params = { taskToken };

  switch (jobExecutionResult.status) {
    // case 'fail':
    // case 'failure':
    //   method = 'sendTaskFailure';
    //   params.cause = jobExecutionResult.summary;
    //   params.error = jobExecutionResult.error;
    //   break;
    case 'heartbeat':
      method = 'sendTaskHeartbeat';
      break;
    case 'success':
    default:
      method = 'sendTaskSuccess';
      params.output = JSON.stringify({jobExecutionResult});
  }

  await stepfunctions[method](params).promise();

  callback(null,  {});
}
