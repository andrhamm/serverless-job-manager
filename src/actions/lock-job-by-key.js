import { splitJobStaticProps } from '../lib/job_executions_utils';

export const makeLockJobByKey = ({ jobsRepository }) => async function lockJobByKey(jobKey) {
  const jobRaw = await jobsRepository.lockJobByKey(jobKey);

  const {
    jobStatic,
    job,
  } = splitJobStaticProps(jobRaw);

  return {
    jobStatic,
    job,
  };
};
