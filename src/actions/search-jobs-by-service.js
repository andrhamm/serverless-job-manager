export const makeSearchJobsByService = ({
  jobsRepository,
}) => async function searchJobsByService({
  serviceName,
}) {
  return jobsRepository.searchJobsByService(serviceName);
};
