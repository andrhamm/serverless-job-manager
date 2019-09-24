import PQueue from 'p-queue';

export const makeSearchJobs = ({
  jobsRepository,
}) => async function searchJobs({
  jobGuids,
  jobKeys,
}) {
  let results = [];

  if (jobGuids || jobKeys) {
    const queue = new PQueue({ autoStart: false, concurrency: 4 });

    if (jobGuids) {
      jobGuids.forEach((jobGuid) => {
      // console.log(`adding getJobKeyByGuid to queue ${jobGuid}`);
        queue.add(() =>
        // console.log(`doing getJobKeyByGuid ${jobGuid}`);
          jobsRepository.getJobKeyByGuid(jobGuid).then((jobKey) => {
          // console.log(`getJobKeyByGuid resolved ${jobGuid}:${JSON.stringify(jobKey)}`);
            if (jobKey) {
            // console.log(`adding getJobKeyByGuid.getJob to
            // queue ${jobGuid}:${JSON.stringify(jobKey)}`);
              queue.add(() =>
              // console.log(`doing getJobKeyByGuid.getJob ${jobGuid}:${JSON.stringify(jobKey)}`);
                jobsRepository.getJobByKey(jobKey).then((job) => {
                // console.log(`resolved getJobKeyByGuid.getJob
                // ${jobGuid}:${JSON.stringify(job)}`);
                  if (job) {
                    results.push(job);
                  }
                }),
              );
            }
          })
          , { priority: 1 });
      });
    } else if (jobKeys) {
      jobKeys.forEach((jobKey) => {
        queue.add(() => jobsRepository.getJobByKey(jobKey).then((job) => {
          if (job) {
            results.push(job);
          }
        }));
      });
    }

    if (queue) {
      queue.start();

      // console.log(`waiting for queue to idle`);
      await queue.onIdle();
    // console.log(`queue idle`);
    }
  } else {
    // return all jobs
    results = jobsRepository.scanJobs();
  }

  return results;
};
