import {
  createContainer, asClass, asFunction,
} from 'awilix';

import { makeAwaitStateMachineExecution } from './actions/await-state-machine-execution';
import { makeGetFailedExecutions } from './actions/get-failed-executions';
import { makeGetHttpClient } from './infra/http';
import { makeGetJobByKey } from './actions/get-job-by-key';
import { makeGetJobExecutionByExecutionKey } from './actions/get-job-execution-by-execution-key';
import { makeGetJobKeyByGuid } from './actions/get-job-key-by-guid';
import { makeGetLogger } from './infra/logger';
import { makeInsertJob } from './actions/insert-job';
import { makeInsertJobExecution } from './actions/insert-job-execution';
import { makeInvokeMockDelayedCallback } from './actions/invoke-mock-delayed-callback';
import { makeInvokeServiceExecution } from './actions/invoke-service-execution';
import { makeLockJobByKey } from './actions/lock-job-by-key';
import { makeMockDelayedServiceExecutionCallback } from './actions/mock-delayed-service-execution-callback';
import { makeSearchJobExecutions } from './actions/search-job-executions';
import { makeSearchJobs } from './actions/search-jobs';
import { makeSearchJobsByService } from './actions/search-jobs-by-service';
import { makeServiceExecutionCallback } from './actions/service-execution-callback';
import { makeSoftDeleteJob } from './actions/soft-delete-job';
import { makeUpdateAwaitCallbackActivityStatus } from './actions/update-await-callback-activity-status';
import { makeUpdateJobExecutionCallbackTaskToken } from './actions/update-job-execution-callback-task-token';
import { makeUpdateJobExecutionWithExecutionResults } from './actions/update-job-execution-with-execution-results';
import { makeUpdateJobSchedule } from './actions/update-job-schedule';
import { makeUpdateJobScheduleTargets } from './actions/update-job-schedule-targets';
import { makeUpdateJobWithExecutionResults } from './actions/update-job-with-execution-results';

import JobsRepository from './repositories/JobsRepository';

// @see https://github.com/talyssonoc/node-api-boilerplate/blob/master/src/container.js

function requireEnvVar(envVarName) {
  const val = process.env[envVarName];

  if (!val) {
    throw new Error(`${envVarName} is not defined.`);
  }

  return val;
}

export default function configureContainer() {
  const container = createContainer();

  // System
  container.register({
    getLogger: asFunction(makeGetLogger),
    getHttpClient: asFunction(makeGetHttpClient),
  });

  // Environment Variables
  container.register({
    apiBaseUrl: asFunction(() => requireEnvVar('API_BASE')),
    cloudwatchEventsRulePrefix: asFunction(() => requireEnvVar('CLOUDWATCH_EVENTS_RULE_PREFIX')),
    iamRoleArnCloudwatchEvents: asFunction(() => requireEnvVar('IAM_ROLE_ARN_CLOUDWATCH_EVENTS')),
    indexNameJobsGuid: asFunction(() => requireEnvVar('DYNAMODB_INDEX_NAME_JOBS_GUID')),
    lambdaArnMockDelayedCallback: asFunction(() => requireEnvVar('LAMBDA_ARN_MOCK_DELAYED_CALLBACK')),
    partitionCountJobExecutions: asFunction(() => requireEnvVar('DYNAMODB_PARTITION_COUNT_JOB_EXECUTIONS')),
    stackName: asFunction(() => requireEnvVar('STACK_NAME')),
    stateMachineArn: asFunction(() => requireEnvVar('STATE_MACHINE_ARN')),
    stateMachineArnExecuteJob: asFunction(() => requireEnvVar('STATE_MACHINE_ARN_EXECUTE_JOB')),
    stateMachineArnExecutionCallback: asFunction(() => requireEnvVar('STATE_MACHINE_ARN_EXECUTION_CALLBACK')),
    tableNameJobExecutions: asFunction(() => requireEnvVar('DYNAMODB_TABLE_NAME_JOB_EXECUTIONS')),
    tableNameJobs: asFunction(() => requireEnvVar('DYNAMODB_TABLE_NAME_JOBS')),
  });

  // Repositories
  container.register({
    jobsRepository: asClass(JobsRepository).singleton(),
  });

  // Actions
  container.register({
    awaitStateMachineExecution: asFunction(makeAwaitStateMachineExecution),
    getFailedExecutions: asFunction(makeGetFailedExecutions),
    getJobByKey: asFunction(makeGetJobByKey),
    getJobExecutionByExecutionKey: asFunction(makeGetJobExecutionByExecutionKey),
    getJobKeyByGuid: asFunction(makeGetJobKeyByGuid),
    insertJob: asFunction(makeInsertJob),
    insertJobExecution: asFunction(makeInsertJobExecution),
    invokeMockDelayedCallback: asFunction(makeInvokeMockDelayedCallback),
    invokeServiceExecution: asFunction(makeInvokeServiceExecution),
    lockJobByKey: asFunction(makeLockJobByKey),
    mockDelayedServiceExecutionCallback: asFunction(makeMockDelayedServiceExecutionCallback),
    searchJobExecutions: asFunction(makeSearchJobExecutions),
    searchJobs: asFunction(makeSearchJobs),
    searchJobsByService: asFunction(makeSearchJobsByService),
    serviceExecutionCallback: asFunction(makeServiceExecutionCallback),
    softDeleteJob: asFunction(makeSoftDeleteJob),
    updateAwaitCallbackActivityStatus: asFunction(makeUpdateAwaitCallbackActivityStatus),
    updateJobExecutionCallbackTaskToken: asFunction(makeUpdateJobExecutionCallbackTaskToken),
    updateJobExecutionWithExecutionResults: asFunction(makeUpdateJobExecutionWithExecutionResults),
    updateJobSchedule: asFunction(makeUpdateJobSchedule),
    updateJobScheduleTargets: asFunction(makeUpdateJobScheduleTargets),
    updateJobWithExecutionResults: asFunction(makeUpdateJobWithExecutionResults),
  });

  return container;
}
