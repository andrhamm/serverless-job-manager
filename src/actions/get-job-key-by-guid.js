export const makeGetJobKeyByGuid = ({
  jobsRepository,
}) => async function getJobKeyByGuid(jobGuid) {
  const jobKey = await jobsRepository.getJobKeyByGuid(jobGuid);

  return jobKey;
};
