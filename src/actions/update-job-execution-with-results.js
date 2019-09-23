import { filterJobStaticExecutionRelevantProps } from '../lib/job_executions_utils';

export const makeUpdateJobExecutionWithResults = ({
  jobsRepository,
}) => function updateJobExecutionWithResults(
  jobExecutionKey,
  serviceInvokedAt,
  jobStatic,
  jobExecutionResult,
) {
  return jobsRepository.updateJobExecutionWithResults(
    jobExecutionKey,
    serviceInvokedAt,
    filterJobStaticExecutionRelevantProps(jobStatic),
    jobExecutionResult,
  );
};
