import { stepfunctions } from '../lib/aws_clients';

export const makeUpdateAwaitCallbackActivityStatus = () =>
  async function updateAwaitCallbackActivityStatus(
    jobExecutionResult,
    callbackTaskToken,
  ) {
    const { status, progress } = jobExecutionResult;
    let method;
    const params = { taskToken: callbackTaskToken };
    let outcome = 'success';

    switch (status) {
      case 'heartbeat':
      case 'processing':
        method = 'sendTaskHeartbeat';
        outcome = 'heartbeat';
        break;
      case 'success':
      default:
        method = 'sendTaskSuccess';
        params.output = JSON.stringify(jobExecutionResult);
    }

    await stepfunctions[method](params).promise();

    return {
      outcome,
      progress: progress || 0,
      updatedAt: Date.now(),
    };
  }
;
