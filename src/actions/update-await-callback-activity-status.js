import { stepfunctions } from '../lib/aws_clients';

export const makeUpdateAwaitCallbackActivityStatus = ({ getLogger }) =>
  async function updateAwaitCallbackActivityStatus(
    jobExecutionResult,
    callbackTaskToken,
  ) {
    const logger = getLogger();
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

    logger.addContext(`${method}Params`, params);
    logger.debug(`calling ${method}`);

    const res = await stepfunctions[method](params).promise();

    logger.debug(`${method} result: ${JSON.stringify(res)}`);

    return {
      outcome,
      progress: progress || 0,
      updatedAt: Date.now(),
    };
  }
;
