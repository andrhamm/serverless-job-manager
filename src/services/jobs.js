import assert from 'assert';

export default function makeJobsService({
  jobsRepository
}) {
  assert(jobsRepository, 'opts.jobsRepository is required.');

  return {
    getJob: async (jobKey) => {
      const job = await jobsRepository.getJob(jobKey);
      return job;
    },
  };
}
