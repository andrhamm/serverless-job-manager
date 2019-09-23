export const makeInsertJobExecution = ({jobsRepository}) => {
  return async function insertJobExecution(executionName, serviceName, jobName, triggerEvent) {
    return await jobsRepository.insertJobExecution(executionName, serviceName, jobName, triggerEvent);
  };
};