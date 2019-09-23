export const makeInsertJob = ({ jobsRepository }) => function insertJob(job) {
  return jobsRepository.insertJob(job);
};
