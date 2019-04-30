import PQueue from 'p-queue';
import { getJob, getJobKeyByGuid, scanJobs } from '../../lib/dynamodb_utils';
import { camelCaseObj, snakeCaseObj } from '../../lib/common';

const {
  DYNAMODB_TABLE_NAME_JOBS,
  DYNAMODB_INDEX_NAME_JOBS_GUID,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    resource,
    pathParameters,
    multiValueQueryStringParameters,
  } = input;

  let results = [];
  const queue = new PQueue({ autoStart: false, concurrency: 4 });

  if (resource === '/services/{serviceName}/jobs') {
    const pathParams = camelCaseObj(pathParameters || {});

    results = await scanJobs(pathParams.serviceName, {DYNAMODB_TABLE_NAME_JOBS});
  } else if (resource === '/jobs') {
    const params = camelCaseObj(multiValueQueryStringParameters || {});

    if (params.jobGuid) {
      const jobGuids = params.jobGuid;

      jobGuids.forEach((jobGuid) => {
        // console.log(`adding getJobKeyByGuid to queue ${jobGuid}`);
        queue.add(() => {
          // console.log(`doing getJobKeyByGuid ${jobGuid}`);
          return getJobKeyByGuid(jobGuid, {
            DYNAMODB_INDEX_NAME_JOBS_GUID,
            DYNAMODB_TABLE_NAME_JOBS,
          }).then((jobKey) => {
            // console.log(`getJobKeyByGuid resolved ${jobGuid}:${JSON.stringify(jobKey)}`);
            if (jobKey) {
              // console.log(`adding getJobKeyByGuid.getJob to queue ${jobGuid}:${JSON.stringify(jobKey)}`);
              queue.add(() => {
                // console.log(`doing getJobKeyByGuid.getJob ${jobGuid}:${JSON.stringify(jobKey)}`);
                return getJob(jobKey, {
                  DYNAMODB_TABLE_NAME_JOBS,
                }).then((job) => {
                  // console.log(`resolved getJobKeyByGuid.getJob ${jobGuid}:${JSON.stringify(job)}`);
                  if (job) {
                    results.push(snakeCaseObj(job));
                  }
                });
              });
            }
          });
        }, { priority: 1 });
      });
    } else if (params.jobName) {
      let jobKeys;
      let statusCode = 400;
      let headers = {'Content-Type': 'application/json'};

      if (params.jobName) {
        if (!params.serviceName ||
            (params.jobName.length > 1 && (params.serviceName.length > 1 && params.serviceName.length !== params.jobName.length))
        ) {
          return {
            statusCode, headers, body: `{"message":"Missing or invalid service_name"}`,
          };
        }

        jobKeys = params.jobName.map((jobName, i) => {
          const serviceName = params.serviceName[i] || params.serviceName[0];
          return {serviceName, jobName};
        });
      }

      if (jobKeys) {
        jobKeys.forEach((jobKey) => {
          queue.add(() => {
            return getJob(jobKey, {
              DYNAMODB_TABLE_NAME_JOBS,
            }).then((job) => {
              if (job) {
                results.push(snakeCaseObj(job));
              }
            });
          });
        });
      }
    } else {
      // all jobs
      results = await scanJobs(null, {DYNAMODB_TABLE_NAME_JOBS});
    }
  }

  if (queue) {
    queue.start();

    // console.log(`waiting for queue to idle`);
    await queue.onIdle();
    // console.log(`queue idle`);
  }

  const response = {
    results,
  };

  callback(null,  {
    statusCode: 200,
    body: JSON.stringify(response, null, 2),
  });
}
