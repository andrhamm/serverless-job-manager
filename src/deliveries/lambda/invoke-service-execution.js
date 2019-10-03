import { inspect } from 'util';
import configureContainer from '../../container';

function makeDeliveryLambdaInvokeServiceExecution({ invokeServiceExecution, getLogger }) {
  return async function delivery(input) {
    const {
      jobStatic: {
        guid: jobGuid,
        invocationTarget,
        invocationType,
        jobName,
        payload,
        ruleSchedule,
        ttlSeconds,
      },
      jobExecution: {
        key: jobExecutionKey,
        event: {
          time: eventTime,
        },
      },
      job,
    } = input;

    const { lastSuccessfulExecution } = job || {};

    const logger = getLogger();
    logger.addContext('guid', jobGuid);
    logger.debug(`event: ${inspect(input)}`);

    const {
      serviceInvokedAtMs,
      serviceInvocationResponse,
    } = await invokeServiceExecution({
      eventTime,
      invocationTarget,
      invocationType,
      jobExecutionKey,
      jobGuid,
      jobName,
      lastSuccessfulExecution,
      payload,
      ruleSchedule,
      ttlSeconds,
    });

    const output = { ...input };
    output.jobExecution.serviceInvokedAt = parseInt(serviceInvokedAtMs / 1000, 10);
    output.jobExecution.serviceInvocationResponse = serviceInvocationResponse;

    return output;
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaInvokeServiceExecution);
