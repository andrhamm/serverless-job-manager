import axios from 'axios';
import { dynamodb, dynamodbUnmarshall } from '../lib/aws_clients';
import { snakeCaseObj } from '../lib/common';
import { encodeExecutionKey } from '../lib/job_executions_utils';

const {
  API_BASE,
  DYNAMODB_TABLE_NAME_JOBS,
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    invocationType,
    invocationTarget,
    partitionKey,
    sortKey,
    eventTime,
    jobName,
    jobGuid,
    payload,
    ruleSchedule,
    previousInvocation,
    ttlSeconds,
  } = input;

  if (invocationType !== 'http') {
    throw new Error('Unsupported invocation type');
  }

  const executionKey = {
    partitionKey,
    sortKey,
  };

  const scheduledTime = new Date(eventTime);
  const scheduledTimeMs = scheduledTime.getTime();
  const encodedExecutionKey = encodeExecutionKey(executionKey);
  // TODO: add path as env var using cloudformation var
  const callbackUrl = `https://${API_BASE}/callback/${encodeURIComponent(jobGuid)}/${encodeURIComponent(encodedExecutionKey)}`;
  const serviceEvent = snakeCaseObj({
    jobName,
    schedule: ruleSchedule,
    scheduledTime: eventTime,
    scheduledTimeMs,
    callbackUrl,
    payload,
    previousInvocation,
  });

  // TODO: track this metric
  const serviceInvokedAt = Date.now();
  const lagMs = serviceInvokedAt - scheduledTimeMs;
  const lagPct = ((lagMs / (ttlSeconds*1000)) * 100).toFixed(1);
  console.log(`Invoking service job execution with ${lagMs}ms latency (${lagPct}% of ${ttlSeconds}s ttl):\nPOST ${invocationTarget}\n${JSON.stringify(serviceEvent, null, 2)}`);
  console.log(callbackUrl);

  // TODO: configure request timeout, etc
  await axios.post(invocationTarget, serviceEvent);

  // TODO: validate status
  callback(null, {
    ...input,
    serviceInvokedAt,
  });
}
