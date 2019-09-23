export const makeGetJobKeyByGuid = ({jobsRepository}) => {
  return async function getJobKeyByGuid(jobGuid) {
    const jobKey = await jobsRepository.getJobKeyByGuid(jobGuid);

    return jobKey;
  };
};