export const makeInsertJobExecution = ({
  jobsRepository,
}) => async function insertJobExecution(executionName, serviceName, jobName, triggerEvent) {
  return jobsRepository.insertJobExecution(executionName, serviceName, jobName, triggerEvent);
};
