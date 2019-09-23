export const makeSoftDeleteJob = ({ jobsRepository }) => async function softDeleteJob(jobKey) {
  return jobsRepository.softDeleteJob(jobKey);
};
