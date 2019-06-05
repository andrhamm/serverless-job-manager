import axios from 'axios';
import { dynamodb, dynamodbUnmarshall } from '../lib/aws_clients';
import { snakeCaseObj } from '../lib/common';
import { encodeJobExecutionKey } from '../lib/job_executions_utils';

const {
  API_BASE,
  DYNAMODB_TABLE_NAME_JOBS,
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));
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

  if (invocationType !== 'http') {
    throw new Error('Unsupported invocation type');
  }

  const scheduledTime = new Date(eventTime);
  const scheduledTimeMs = scheduledTime.getTime();
  const encodedJobExecutionKey = encodeJobExecutionKey(jobExecutionKey);
  // TODO: add path as env var using cloudformation var
  const callbackUrl = `https://${API_BASE}/callback/${encodeURIComponent(jobGuid)}/${encodeURIComponent(encodedJobExecutionKey)}`;
  const serviceEvent = snakeCaseObj({
    callbackUrl,
    jobName,
    payload,
    lastSuccessfulExecution,
    schedule: ruleSchedule,
    scheduledTime: eventTime,
    scheduledTimeMs,
  });

  // TODO: track this metric
  const serviceInvokedAtMs = Date.now();
  const lagMs = serviceInvokedAtMs - scheduledTimeMs;
  const lagPct = ((lagMs / (ttlSeconds*1000)) * 100).toFixed(1);
  console.log(`Invoking service job execution with ${lagMs}ms latency (${lagPct}% of ${ttlSeconds}s ttl):\nPOST ${invocationTarget}\n${JSON.stringify(serviceEvent, null, 2)}`);
  console.log(callbackUrl);

  // TODO: configure request timeout, etc
  // TODO: validate status
  await axios.post(invocationTarget, serviceEvent);

  const output = { ...input };
  output.jobExecution.serviceInvokedAt = parseInt(serviceInvokedAtMs / 1000);

  callback(null, output);
}
