export const makeUpdateJobWithExecutionResults = ({
  jobsRepository,
}) => function updateJobWithExecutionResults({
  eventTime,
  jobExecutionName,
  jobExecutionResult,
  jobKey,
  serviceInvokedAt,
}) {
  return jobsRepository.updateJobWithExecutionResults(
    jobKey,
    jobExecutionName,
    eventTime,
    serviceInvokedAt,
    jobExecutionResult,
  );
};
