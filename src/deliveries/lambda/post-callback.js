import middy from 'middy';
import {
  httpEventNormalizer,
  httpErrorHandler,
  httpHeaderNormalizer,
} from 'middy/middlewares';
import HttpError from 'http-errors';
import jsonBodiesMiddleware from '../../middlewares/json-bodies';
import configureContainer from '../../container';
import {
  // parseSortKey,
  decodeEncodedCallbackToken,
  filterJobExecutionResult,
} from '../../lib/job_executions_utils';
import { stepfunctions } from '../../lib/aws_clients';

function makeDeliveryLambdaPostCallback({
  getLogger,
  // stateMachineArn,
  stateMachineArnExecuteJob,
  // awaitStateMachineExecution,

  extendJobLockByJobKey,
  getJobByKey,
  getJobExecutionByExecutionKey,
  getJobKeyByGuid,
  updateAwaitCallbackActivityStatus,
}) {
  let logger = getLogger(); // this is probably not the right way to do this...

  // As gross as this is, AWS will soon release the ability to execute
  // a Step Function synchronously and this will no longer be necessary
  return middy(async (input) => {
    logger = getLogger();
    logger.addContext('input', input);
    logger.debug('start');

    const {
      // requestContext: {
      //   requestTimeEpoch,
      // },
      pathParameters: {
        callbackToken,
      },
      body: callback,
    } = input;

    const {
      jobExecutionKey,
      jobExecutionName,
      jobGuid,
    } = decodeEncodedCallbackToken(decodeURIComponent(callbackToken));
    // const { sortKey } = jobExecutionKey;

    // fail fast if the job execution for this callback is no longer running
    const jobExecutionArn = `${stateMachineArnExecuteJob.replace(':stateMachine:', ':execution:')}:${jobExecutionName}`;
    logger.addContext('jobExecutionArn', jobExecutionArn);
    logger.debug(`Checking status of job execution ${jobExecutionArn}`);
    const { status: jobExecutionStatus } = await stepfunctions.describeExecution({
      executionArn: jobExecutionArn,
    }).promise();

    if (jobExecutionStatus !== 'RUNNING') {
      throw new HttpError.Gone(`The job execution status is ${jobExecutionStatus}`);
    }

    // const {
    //   eventId,
    //   jobName,
    //   serviceName,
    // } = parseSortKey(sortKey);

    const jobExecutionPromise = getJobExecutionByExecutionKey(jobExecutionKey);
    const jobKey = await getJobKeyByGuid(jobGuid);
    const {
      jobStatic,
      // job,
    } = await getJobByKey(jobKey);

    const { callbackTaskToken } = await jobExecutionPromise;

    const callbackParams = filterJobExecutionResult(callback);
    const {
      outcome,
      progress,
      // updatedAt,
    } = await updateAwaitCallbackActivityStatus(
      callbackParams,
      callbackTaskToken,
    );

    let body = '';
    if (outcome === 'heartbeat' && jobStatic.exclusive) {
      body = await extendJobLockByJobKey({
        jobExecutionName,
        jobKey,
        progress,
      });
    }

    logger.addContext('response', body);
    logger.debug('done');

    return body;
  }).use(httpHeaderNormalizer())
    .use(httpEventNormalizer())
    .use(httpErrorHandler())
    .use(jsonBodiesMiddleware({ requireJson: true, logger }))
  ;
}

export const delivery = configureContainer().build(
  makeDeliveryLambdaPostCallback,
);
