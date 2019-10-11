export const makeExtendJobLockByJobKey = ({
  callbackHeartbeatIntervalSeconds,
  jobsRepository,
}) => async function extendJobLockByJobKey({
  jobExecutionName,
  jobKey,
  progress,
}) {
  const updatedJob = await jobsRepository.extendJobExecutionLock(
    jobKey,
    jobExecutionName,
    callbackHeartbeatIntervalSeconds,
    progress,
  );

  return updatedJob;
};
