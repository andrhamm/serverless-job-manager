import { snakeCaseObj } from '../../lib/common';
import configureContainer from '../../container';

function makeDeliveryLambdaAwaitStateMachineExecution({
  awaitStateMachineExecution,
  stateMachineArn,
  getLogger,
}) {
  // As gross as this is, AWS will soon release the ability to execute
  // a Step Function synchronously and this will no longer be necessary
  return async function delivery(input, context, callback) {
    const logger = getLogger();
    // logger.addContext('guid', guid);
    logger.debug(`event: ${JSON.stringify(input)}`);

    let {
      stateMachineArn: givenStateMachineArn,
      executionInput,
      executionName,
    } = input;

    const targetStateMachineArn = givenStateMachineArn || stateMachineArn;

    if (!executionInput) {
      executionInput = input || {};
    }

    if (!executionName && input.requestContext) {
      executionName = input.requestContext.requestId;
    }

    const execution = await awaitStateMachineExecution({
      stateMachineArn: targetStateMachineArn,
      executionInput,
      executionName,
    });

    logger.debug(`awaitStateMachineExecution result: ${JSON.stringify(execution)}`);

    if (input.requestContext && input.requestContext.apiId) {
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

        // TODO: this is a hot mess and doesn't work...
        // if Lambda.ResourceNotFoundException happens, should be 500 not 200
        if (result.Error) {
          logger.debug(`execution.output: ${JSON.stringify(result)}`);

          let { Error: code, Cause: causeJson } = result;
          if (causeJson) {
            try {
              // console.log(`causeJson: ${causeJson}`);
              const cause = JSON.parse(causeJson);

              ({ errorMessage, errorType, trace } = cause);

              errorMessage = errorMessage.split('\n')[0];

              // console.log(`trace: ${JSON.stringify(trace)}`);

              ({ statusCode, headers: headersOverride, code } = JSON.parse(trace.find(l => l.startsWith('Extra: ')).slice(7)));
            } catch (e) {
              // blah
              logger.error(`Failed to parse Extra from stack trace: ${e.message}`);
            }
          } else {
            statusCode = code.includes('BadRequest') ? 400 : 500;
          }

          body = {
            message: errorMessage || errorType || code,
            code,
          };
        } else if (result.statusCode) {
          // console.log('result.statusCode');
          ({ statusCode, body, headers } = result);

          if (!body) {
            body = result;
            delete body.headers;
            delete body.statusCode;
          }
        } else {
          // console.log('else body = result');
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

      const resp = {
        statusCode,
        headers: headers || ({
          'Content-Type': 'application/json',
          ...headersOverride,
        }),
        body: JSON.stringify(body, null, 2),
      };

      logger.debug(`resp: ${JSON.stringify(resp, null, 2)}`);

      callback(null, resp);
    } else {
      logger.debug('requestContext and requestContext.apiId not found, normal callback');
      callback(null, execution);
    }
  };
}

export const delivery = configureContainer().build(makeDeliveryLambdaAwaitStateMachineExecution);
