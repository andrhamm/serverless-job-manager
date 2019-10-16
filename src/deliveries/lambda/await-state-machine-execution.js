import { requireJson, snakeCaseObj } from '../../lib/common';
import configureContainer from '../../container';
import { parseSortKey, decodeEncodedJobExecutionKey, filterJobExecutionResult } from '../../lib/job_executions_utils';

function makeDeliveryLambdaAwaitStateMachineExecution({
  awaitStateMachineExecution,
  stateMachineArnExecutionCallback,
  stateMachineArn,
  getLogger,
}) {
  // As gross as this is, AWS will soon release the ability to execute
  // a Step Function synchronously and this will no longer be necessary
  return async function delivery(input) {
    const logger = getLogger();
    // logger.addContext('guid', guid);
    logger.addContext('input', input);
    logger.debug('start');

    // API Gateway doesn't let you require a specific content-type, so if
    // it is not json, the jsonschema validation will not have been applied
    const notJson = requireJson(input.headers);
    if (notJson) {
      return notJson;
    }

    const {
      requestContext: {
        requestTimeEpoch,
      },
      body: bodyJson,
    } = input;

    let executionName = input.requestContext.requestId;
    let executionInput;

    // for certain statemachines we want to customize the execution name
    if (stateMachineArn === stateMachineArnExecutionCallback) {
      const {
        pathParameters: {
          jobGuid,
          encodedJobExecutionKey,
        },
      } = input;
      const jobExecutionKey = decodeEncodedJobExecutionKey(
        decodeURIComponent(encodedJobExecutionKey),
      );
      const { sortKey } = jobExecutionKey;
      const {
        eventId,
        jobName,
        serviceName,
      } = parseSortKey(sortKey);
      const jobExecutionResultUnfiltered = JSON.parse(bodyJson);
      const jobExecutionResult = filterJobExecutionResult(jobExecutionResultUnfiltered);
      const { status } = jobExecutionResult;

      // attempt to make an execution name that is somewhat human readable
      // on the AWS Step Functions console
      executionName = `${serviceName.slice(0, 18)}.${jobName.slice(0, 18)}--${eventId.slice(-12)}-${requestTimeEpoch}-${status.slice(0, 1)}`;
      executionInput = {
        jobGuid,
        jobExecutionKey,
        jobExecutionResult,
        callbackTimeMs: requestTimeEpoch,
      };
    } else {
      executionInput = input;
    }

    const execution = await awaitStateMachineExecution({
      stateMachineArn,
      executionInput,
      executionName,
    });

    let statusCode;
    let body;
    let headers;
    let headersOverride;
    let errorMessage;
    let errorType;
    let trace;

    if (execution.status === 'SUCCEEDED') {
      statusCode = 200;
      const result = JSON.parse(execution.output);
      logger.addContext('stateMachineOutput', result);

      // TODO: this is a hot mess and doesn't work...
      // if Lambda.ResourceNotFoundException happens, should be 500 not 200
      if (result.Error) {
        let { Error: code, Cause: causeJson } = result;
        if (causeJson) {
          try {
            const cause = JSON.parse(causeJson);

            logger.addContext('stateMachineOutputErrorCause', cause);

            ({ errorMessage, errorType, trace } = cause);

            errorMessage = errorMessage.split('\n')[0];

            ({ statusCode, headers: headersOverride, code } = JSON.parse(trace.find(l => l.startsWith('Extra: ')).slice(7)));
          } catch (e) {
            // blah
            logger.debug(`Failed to parse Extra from stack trace: ${e.message}`);
          }
        } else {
          statusCode = code.includes('BadRequest') ? 400 : 500;
        }

        body = {
          message: errorMessage || errorType || code,
          code,
        };
      } else if (result.statusCode) {
        ({ statusCode, body, headers } = result);

        if (!body) {
          body = result;
          delete body.headers;
          delete body.statusCode;
        }
      } else {
        body = result;
      }

      body = snakeCaseObj(body);
    } else {
      statusCode = 500;
      body = {
        message: 'Internal Server Error',
        code: `EXECUTION_${execution.status}`,
      };
    }

    logger.addContext('awaitStateMachineExecutionResult', execution);
    logger.debug('state machine execution complete');

    const resp = {
      statusCode,
      headers: headers || ({
        'Content-Type': 'application/json',
        ...headersOverride,
      }),
      body: JSON.stringify(body, null, 2),
    };

    logger.addContext('response', resp);
    logger.addContext('responseBody', body);
    logger.debug('end');

    return resp;
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaAwaitStateMachineExecution);
