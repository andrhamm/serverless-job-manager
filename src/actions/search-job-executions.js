import {
  genericDecode,
  genericEncode,
} from '../lib/job_executions_utils';

export const makeSearchJobExecutions = ({
  jobsRepository,
  getLogger,
}) => async function searchJobExecutions({
  jobName: jobNameParam,
  moreToken,
  serviceName: serviceNameParam,
  since: sinceParam,
}) {
  const logger = getLogger();

  let context;
  let jobName;
  let serviceName;
  let since;

  if (moreToken) {
    const decodedMore = genericDecode(moreToken);
    logger.addContext('moreTokenDecoded', decodedMore);

    ({
      c: context,
      j: jobName,
      s: since,
      sn: serviceName,
    } = decodedMore);
  } else {
    since = sinceParam;
    serviceName = serviceNameParam;
    jobName = jobNameParam;
  }

  const {
    results,
    params,
  } = await jobsRepository.searchJobExecutions({
    context,
    jobName,
    serviceName,
    since,
  });

  return {
    results,
    sinceMs: params.since,
    moreToken: genericEncode({
      c: params.context,
      s: params.since,
      sn: params.serviceName,
      j: params.jobName,
    }),
  };
};
