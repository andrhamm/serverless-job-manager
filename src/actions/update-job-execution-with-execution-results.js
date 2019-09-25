import { filterJobStaticExecutionRelevantProps } from '../lib/job_executions_utils';

export const makeUpdateJobExecutionWithExecutionResults = ({
  jobsRepository,
}) => function updateJobExecutionWithExecutionResults(
  jobExecutionKey,
  serviceInvokedAt,
  jobStatic,
  jobExecutionResult,
) {
  return jobsRepository.updateJobExecutionWithExecutionResults(
    jobExecutionKey,
    serviceInvokedAt,
    filterJobStaticExecutionRelevantProps(jobStatic),
    jobExecutionResult,
  );
};
