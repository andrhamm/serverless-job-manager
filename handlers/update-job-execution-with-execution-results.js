import { dynamodb, dynamodbMarshall, dynamodbUnmarshall } from '../lib/aws_clients';
import { filterJobStaticExecutionRelevantProps } from '../lib/job_executions_utils';

const {
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
} = process.env;

export const handler = async (inputs, context, callback) => {
  console.log('event: ' + JSON.stringify(inputs, null, 2));
  const input = Object.assign({}, ...inputs);

  const {
    jobStatic,
    jobExecution: {
      key: jobExecutionKey,
      serviceInvokedAt,
    },
    jobExecutionResult,
  } = input;

  const { Attributes: updatedJobExecution } = await dynamodb.updateItem({
    TableName: DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
    Key: dynamodbMarshall(jobExecutionKey),
    ExpressionAttributeNames: {
      '#awaitCallbackTaskToken': 'awaitCallbackTaskToken',
      '#result': 'result',
      '#updatedAt': 'updatedAt',
      '#jobStatic': 'jobStatic',
    },
    ExpressionAttributeValues: dynamodbMarshall({
      ':now': parseInt(Date.now() / 1000),
      ':null': null,
      ':res': {
        ...jobExecutionResult,
        serviceInvokedAt,
      },
      ':jobStatic': filterJobStaticExecutionRelevantProps(jobStatic),
    }),
    UpdateExpression: 'SET #updatedAt = :now, #awaitCallbackTaskToken = :null, #result = :res, #jobStatic = :jobStatic',
    ReturnValues: 'UPDATED_NEW',
  }).promise();

  callback(null, dynamodbUnmarshall(updatedJobExecution));
}
