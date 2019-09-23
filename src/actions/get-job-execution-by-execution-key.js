export const makeGetJobExecutionByExecutionKey = ({jobsRepository}) => {
  return async function getJobExecutionByExecutionKey(jobExecutionKey) {
    const jobExecution = await jobsRepository.getJobExecutionByExecutionKey(jobExecutionKey);

    jobExecution.key = jobExecutionKey;
    
    return jobExecution;
  };
};