import { encodeJobExecutionKey } from '../lib/job_executions_utils';
import { snakeCaseObj } from '../lib/common';

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

  const http = getHttpClient();
  const scheduledTime = new Date(eventTime);
  const scheduledTimeMs = scheduledTime.getTime();
  const encodedJobExecutionKey = encodeJobExecutionKey(jobExecutionKey);
  // TODO: add path as env var using cloudformation var
  const callbackUrl = `${apiBaseUrl}/callback/${encodeURIComponent(jobGuid)}/${encodeURIComponent(encodedJobExecutionKey)}`;

  const serviceEvent = snakeCaseObj({
    callbackUrl,
    jobName,
    lastSuccessfulExecution: lastSuccessfulExecution ? snakeCaseObj({
      ...lastSuccessfulExecution,
      scheduled_time_ms: (new Date(lastSuccessfulExecution.scheduledTime)).getTime(),
    }) : {},
    payload,
    schedule: ruleSchedule,
    scheduledTime: eventTime,
    scheduledTimeMs,
  });

  logger.addContext('callbackUrl', callbackUrl);
  logger.addContext('serviceExecutionPayload', serviceEvent);

  // TODO: track this metric
  const serviceInvokedAtMs = Date.now();
  const lagMs = serviceInvokedAtMs - scheduledTimeMs;
  const lagPct = ((lagMs / (ttlSeconds * 1000)) * 100).toFixed(1);

  logger.debug(`Invoking service job execution with ${lagMs}ms latency (${lagPct}% of ${ttlSeconds}s ttl, (POST ${invocationTarget})`);

  // TODO: configure request timeout, etc
  // TODO: validate status
  // TODO: add support for `sync` jobs (response to this call is the result of the job)
  const result = await http(invocationTarget, {
    method: 'post',
    body: JSON.stringify({
      ...serviceEvent,
      invocation_latency_ms: lagMs,
      invocation_latency_pct: lagPct,
    }),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  const { status, statusText } = result;

  const body = await result.text();

  logger.debug(`${status} ${statusText}: ${body}`);

  return {
    serviceInvokedAtMs,
    serviceInvocationResponse: status,
  };
};

