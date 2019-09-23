import { splitJobStaticProps } from '../lib/job_executions_utils';

export const makeGetJobByKey = ({ jobsRepository }) => async function getJobByKey(jobKey) {
  const jobRaw = await jobsRepository.getJobByKey(jobKey);

  const {
    jobStatic,
    job,
  } = splitJobStaticProps(jobRaw);

  return {
    jobStatic,
    job,
  };
};
