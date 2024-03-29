import { encodeCallbackToken } from '../lib/job_executions_utils';
import { snakeCaseObj } from '../lib/common';

export const makeInvokeServiceExecution = ({
  apiBaseUrl,
  callbackHeartbeatIntervalSeconds,
  getHttpClient,
  getLogger,
}) => async function invokeServiceExecution({
  eventTime,
  executionName,
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
  const encodedCallbackToken = encodeCallbackToken({
    jobExecutionKey,
    jobExecutionName: executionName,
    jobGuid,
  });
  // TODO: add path as env var using cloudformation var
  const callbackUrl = `${apiBaseUrl}/callback/${encodeURIComponent(encodedCallbackToken)}`;

  const heartbeatIntervalSeconds = Math.min([
    Math.max(30, Math.floor(ttlSeconds / 10)),
    Math.floor(callbackHeartbeatIntervalSeconds * 0.8),
  ]) || callbackHeartbeatIntervalSeconds;

  const serviceEvent = snakeCaseObj({
    callbackUrl,
    heartbeatIntervalSeconds,
    jobName,
    lastSuccessfulExecution: lastSuccessfulExecution ? snakeCaseObj({
      ...lastSuccessfulExecution,
      scheduled_time_ms: (new Date(lastSuccessfulExecution.scheduledTime)).getTime(),
    }) : {},
    payload,
    schedule: ruleSchedule,
    scheduledTime: eventTime,
    scheduledTimeMs,
    ttlSeconds,
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

  const invokeTarget = url => http(url, {
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

  const result = await invokeTarget(invocationTarget);
  const { status, statusText } = result;
  const body = await result.text();
  logger.debug(`${invocationTarget} -> ${status} ${statusText}: ${body}`);

  return {
    heartbeatIntervalSeconds,
    serviceInvokedAtMs,
    serviceInvocationResponse: status,
  };
};
