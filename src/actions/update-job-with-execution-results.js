export const makeUpdateJobWithExecutionResults = ({
  jobsRepository,
}) => function updateJobWithExecutionResults(
  jobKey,
  jobExecutionName,
  eventTime,
  serviceInvokedAt,
  jobExecutionResult,
) {
  return jobsRepository.updateJobWithExecutionResults(
    jobKey,
    jobExecutionName,
    eventTime,
    serviceInvokedAt,
    jobExecutionResult,
  );
};
