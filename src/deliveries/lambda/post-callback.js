import middy from 'middy';
import {
  httpEventNormalizer,
  httpErrorHandler,
  httpHeaderNormalizer,
} from 'middy/middlewares';
import HttpError from 'http-errors';
import jsonBodiesMiddleware from '../../middlewares/json-bodies';
import configureContainer from '../../container';
import { parseSortKey, decodeEncodedCallbackToken, filterJobExecutionResult } from '../../lib/job_executions_utils';
import { stepfunctions } from '../../lib/aws_clients';

function makeDeliveryLambdaAwaitExecutionCallbackStateMachineExecution({
  getLogger,
  stateMachineArn,
  stateMachineArnExecuteJob,
  awaitStateMachineExecution,
}) {
  let logger = getLogger(); // this is probably not the right way to do this...

  // As gross as this is, AWS will soon release the ability to execute
  // a Step Function synchronously and this will no longer be necessary
  return middy(async (input) => {
    logger = getLogger();
    logger.addContext('input', input);
    logger.debug('start');

    const {
      requestContext: {
        requestTimeEpoch,
      },
      pathParameters: {
        callbackToken,
      },
      body: jobExecutionResultUnfiltered,
    } = input;

    let executionName = input.requestContext.requestId;

    // for certain statemachines we want to customize the execution name and input
    // TODO: move these to middlewares

    const {
      jobExecutionKey,
      jobExecutionName,
      jobGuid,
    } = decodeEncodedCallbackToken(decodeURIComponent(callbackToken));
    const { sortKey } = jobExecutionKey;

    // fail fast if the job execution for this callback is no longer running
    const jobExecutionArn = `${stateMachineArnExecuteJob.replace(':stateMachine:', ':execution:')}:${jobExecutionName}`;
    logger.addContext('jobExecutionArn', jobExecutionArn);
    logger.debug(`Checking status of job execution ${jobExecutionArn}`);
    const jobExecution = await stepfunctions.describeExecution({
      executionArn: jobExecutionArn,
    }).promise();

    if (jobExecution.status !== 'RUNNING') {
      throw new HttpError.Gone(`The job execution status is ${jobExecution.status}`);
    }

    const {
      eventId,
      jobName,
      serviceName,
    } = parseSortKey(sortKey);

    const jobExecutionResult = filterJobExecutionResult(jobExecutionResultUnfiltered);
    const { status } = jobExecutionResult;

    // attempt to make an execution name that is somewhat human readable
    // on the AWS Step Functions console
    // Note this is the callback execution, not the job execution
    executionName = `${serviceName.slice(0, 18)}.${jobName.slice(0, 18)}--${eventId.slice(-12)}-${requestTimeEpoch}-${status.slice(0, 1)}`;
    const executionInput = {
      jobGuid,
      jobExecutionKey,
      jobExecutionResult,
      callbackTimeMs: requestTimeEpoch,
    };

    const execution = await awaitStateMachineExecution({
      stateMachineArn,
      executionInput,
      executionName,
    });

    let statusCode = 200;
    let body;
    let errorMessage;
    let errorType;
    let trace;

    if (execution.status === 'SUCCEEDED') {
      const result = JSON.parse(execution.output);
      logger.addContext('stateMachineOutput', result);

      // TODO: this is a hot mess and doesn't work...
      // if Lambda.ResourceNotFoundException happens, should be 500 not 200
      if (result.Error) {
        statusCode = 500;
        let { Error: code, Cause: causeJson } = result;
        if (causeJson) {
          try {
            const cause = JSON.parse(causeJson);

            logger.addContext('stateMachineOutputErrorCause', cause);

            ({ errorMessage, errorType, trace } = cause);

            errorMessage = errorMessage.split('\n')[0];

            ({ statusCode, code } = JSON.parse(trace.find(l => l.startsWith('Extra: ')).slice(7)));
          } catch (e) {
            // blah
            logger.debug(`Failed to parse Extra from stack trace: ${e.message}`);
          }
        } else {
          statusCode = code.includes('BadRequest') ? 400 : 500;
        }

        throw new HttpError(statusCode, errorMessage || errorType || code);
      } else if (result.statusCode) {
        ({ statusCode, body } = result);

        if (!body) {
          body = result;
          delete body.headers;
          delete body.statusCode;
        }
      } else {
        body = result;
      }
    } else {
      logger.error(`State machine execution status: ${execution.status}`);
      throw new HttpError.InternalServerError('Internal Server Error');
    }

    if (statusCode >= 300) {
      throw new HttpError(statusCode);
    }

    logger.addContext('response', body);
    logger.debug('done');

    return body;
  }).use(httpHeaderNormalizer())
    .use(httpEventNormalizer())
    .use(jsonBodiesMiddleware({ requireJson: true, logger }))
    .use(httpErrorHandler());
}

export const delivery = configureContainer().build(
  makeDeliveryLambdaAwaitExecutionCallbackStateMachineExecution,
);
