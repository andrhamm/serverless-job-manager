import { stepfunctions } from '../lib/aws_clients';

export const makeUpdateAwaitCallbackActivityStatus = () =>
  async function updateAwaitCallbackActivityStatus(
    jobExecutionResult,
    callbackTaskToken,
  ) {
    const { status } = jobExecutionResult;
    let method;
    const params = { taskToken: callbackTaskToken };

    switch (status) {
    // case 'fail':
    // case 'failure':
    //   method = 'sendTaskFailure';
    //   params.cause = summary;
    //   params.error = error;
    //   break;
      case 'heartbeat':
        method = 'sendTaskHeartbeat';
        break;
      case 'success':
      default:
        method = 'sendTaskSuccess';
        params.output = JSON.stringify(jobExecutionResult);
    }

    await stepfunctions[method](params).promise();

    return true;
  }
;
