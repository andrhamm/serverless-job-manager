import middy from 'middy';
import {
  httpEventNormalizer,
  httpErrorHandler,
  httpHeaderNormalizer,
} from 'middy/middlewares';
import HttpError from 'http-errors';
import jsonBodiesMiddleware from '../../middlewares/json-bodies';
import configureContainer from '../../container';

// TODO: this is deployed as multiple Lambda Functions. the core logic
// of "awaiting a state machine" should be abstracted to a helper lib instead
function makeDeliveryLambdaAwaitStateMachineExecution({
  awaitStateMachineExecution,
  getLogger,
  stateMachineArn,
  stateMachineArnUpdateJob,
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
        requestId,
      },
    } = input;

    let executionName = input.requestContext.requestId;
    let executionInput;

    // for certain statemachines we want to customize the execution name and input
    // TODO: move these to middlewares
    if (stateMachineArn === stateMachineArnUpdateJob) {
      const {
        pathParameters: {
          serviceName,
          jobName,
        },
        body: jobPreferences,
      } = input;

      // service and job name must not cause issues downstream
      // TODO: maybe just move these args into the req body...
      if (!`${serviceName}${jobName}`.match(/^[a-z0-9-]+$/)) {
        throw new HttpError.BadRequest('Invalid service or job name. Must match "^[a-z0-9-]+$"');
      }

      executionName = `${serviceName.slice(0, 18)}.${jobName.slice(0, 18)}--${requestId.slice(-12)}-${requestTimeEpoch}`;
      executionInput = {
        jobPreferences: {
          ...jobPreferences,
          serviceName,
          jobName,
        },
        requestTimeMs: requestTimeEpoch,
        requestId,
      };
    } else {
      executionInput = input;
    }

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

export const delivery = configureContainer().build(makeDeliveryLambdaAwaitStateMachineExecution);
