import { stepfunctions } from '../lib/aws_clients';
import { delay, snakeCaseObj } from '../lib/common';

const {
  STATE_MACHINE_ARN,
} = process.env;

// As gross as this is, AWS will soon release the ability to execute
// a Step Function synchronously and this will no longer be necessary
export const handler = async (input, context, callback) => {
  // console.log(`event: ` + JSON.stringify(input, null, 2));

  let {
    stateMachineArn,
    executionInput,
    executionName,
  } = input;

  if (!stateMachineArn) {
    stateMachineArn = STATE_MACHINE_ARN;
  }

  if (!executionInput) {
    executionInput = input || {};
  }

  if (!executionName && input.requestContext) {
    executionName = input.requestContext.requestId;
  }

  const { executionArn } = await stepfunctions.startExecution({
    stateMachineArn,
    input: JSON.stringify(executionInput),
    ...executionName && { name: executionName },
  }).promise();

  let delayMs = 50;
  let execution;
  let attempt = 0;
  do {
    await delay(delayMs);
    execution = await stepfunctions.describeExecution({ executionArn }).promise();
    console.log(`attempt ${++attempt} (${delayMs}ms) ${execution.status}`);
    delayMs = 200;
  } while (execution.status === 'RUNNING');

  // console.log(`${JSON.stringify(execution, null, 2)}`);

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

      if (result.Error) {
        // console.log('result.Error');

        let { Error: code, Cause: causeJson } = result;
        if (causeJson) {
          try {
            // console.log(`causeJson: ${causeJson}`);
            const cause = JSON.parse(causeJson);

            ({errorMessage, errorType, trace} = cause);

            errorMessage = errorMessage.split("\n")[0];

            // console.log(`trace: ${JSON.stringify(trace)}`);

            ({statusCode, headers: headersOverride, code} = JSON.parse(trace.find((l) => l.startsWith('Extra: ')).slice(7)));
          } catch (e) {
            // blah
            console.log(`Failed to parse Extra from stack trace: ${e.message}`);
          }
        } else {
          statusCode = error.includes('BadRequest') ? 400 : 500;
        }

        body = {
          message: errorMessage || errorType || error,
          code: code,
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
        message: `Internal Server Error`,
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

    console.log(`resp: ${JSON.stringify(resp, null, 2)}`);

    callback(null,  resp);
  } else {
    console.log(`requestContext and requestContext.apiId not found, normal callback`);
    callback(null, execution);
  }
}
