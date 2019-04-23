import { stepfunctions } from '../lib/aws_clients';

const {
  STATE_MACHINE_ARN_EXECUTE_JOB,
} = process.env;

/* The purpose of this Lambda is to track a known execution by name/arn
 * It is not possible to get the execution ARN from within the execution.
 * If/when that is possible, we can trigger the step function directly
 * from the CloudWatch Event rule event.
*/
export const handler = async (input, context, callback) => {
  console.log(`event: ` + JSON.stringify(input, null, 2));

  const {
    event: {
      id: eventId,
    },
    jobStatic: {
      guid: jobGuid,
    },
  } = input;

  const executionName = `${jobGuid}--${eventId}`;

  const { executionArn } = await stepfunctions.startExecution({
    stateMachineArn: STATE_MACHINE_ARN_EXECUTE_JOB,
    input: JSON.stringify({
      jobExecution: {
        name: executionName,
      },
      ...input,
    }),
    name: executionName,
  }).promise();

  callback(null, { executionArn });
}
