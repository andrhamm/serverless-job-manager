import { snakeCaseObj } from '../lib/common';
import { encodeJobExecutionKey } from '../lib/job_executions_utils';

export const makeInvokeServiceExecution = ({
  getHttpClient,
  getLogger,
  apiBaseUrl,
}) => async function invokeServiceExecution({
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
}) {
  const logger = getLogger();
  logger.addContext('guid', jobGuid);

  if (invocationType !== 'http') {
    throw new Error('Unsupported invocation type');
  }

  const client = getHttpClient();
  const scheduledTime = new Date(eventTime);
  const scheduledTimeMs = scheduledTime.getTime();
  const encodedJobExecutionKey = encodeJobExecutionKey(jobExecutionKey);
  // TODO: add path as env var using cloudformation var
  const callbackUrl = `${apiBaseUrl}/callback/${encodeURIComponent(jobGuid)}/${encodeURIComponent(encodedJobExecutionKey)}`;
  const serviceEvent = snakeCaseObj({
    callbackUrl,
    jobName,
    lastSuccessfulExecution,
    payload,
    schedule: ruleSchedule,
    scheduledTime: eventTime,
    scheduledTimeMs,
  });

    // TODO: track this metric
  const serviceInvokedAtMs = Date.now();
  const lagMs = serviceInvokedAtMs - scheduledTimeMs;
  const lagPct = ((lagMs / (ttlSeconds * 1000)) * 100).toFixed(1);
  logger.addContext('callbackUrl', callbackUrl);
  logger.debug(`Invoking service job execution with ${lagMs}ms latency (${lagPct}% of ${ttlSeconds}s ttl):\nPOST ${invocationTarget}\n${JSON.stringify(serviceEvent)}`);

  // TODO: configure request timeout, etc
  // TODO: validate status
  // TODO: add support for `sync` jobs (response to this call is the result of the job)
  const { status, statusText, data } = await client.post(invocationTarget, serviceEvent);

  logger.debug(`${status} ${statusText} ${data ? JSON.stringify(data) : ''}`);

  return {
    serviceInvokedAtMs,
    serviceInvocationResponse: status,
  };
};
