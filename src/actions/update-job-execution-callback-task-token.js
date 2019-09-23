export const makeUpdateJobExecutionCallbackTaskToken = ({
  jobsRepository,
}) => async function updateJobExecutionCallbackTaskToken(jobExecutionKey, callbackTaskToken) {
  await jobsRepository.updateJobExecutionCallbackTaskToken(jobExecutionKey, callbackTaskToken);
  return true;
};
