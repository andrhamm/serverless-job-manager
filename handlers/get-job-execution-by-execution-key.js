import { dynamodb, dynamodbUnmarshall, dynamodbMarshall } from '../lib/aws_clients';
import { decodeEncodedExecutionKey } from '../lib/job_executions_utils';

const {
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const { encodedExecutionKey } = input.pathParameters;

  const executionKey = decodeEncodedExecutionKey(encodedExecutionKey);

  console.log(`decoded executionKey: ${JSON.stringify(executionKey, null, 2)}`)

  const params = {
    TableName: DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
    ConsistentRead: true,
    Key: dynamodbMarshall(executionKey),
  };

  const { Item: item } = await dynamodb.getItem(params).promise();

  const jobExecution = dynamodbUnmarshall(item);

  callback(null, { jobExecution });
};
