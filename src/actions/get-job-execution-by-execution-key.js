export const makeGetJobExecutionByExecutionKey = ({
  jobsRepository,
}) => async function getJobExecutionByExecutionKey(jobExecutionKey) {
  const jobExecution = await jobsRepository.getJobExecutionByExecutionKey(jobExecutionKey);

  jobExecution.key = jobExecutionKey;

  return jobExecution;
};
