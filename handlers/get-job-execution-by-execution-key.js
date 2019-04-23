import { dynamodb, dynamodbUnmarshall, dynamodbMarshall } from '../lib/aws_clients';

const {
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const { jobExecutionKey, result } = input;

  const params = {
    TableName: DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
    ConsistentRead: true,
    Key: dynamodbMarshall(jobExecutionKey),
  };

  const { Item: item } = await dynamodb.getItem(params).promise();

  const jobExecution = dynamodbUnmarshall(item);

  jobExecution.key = jobExecutionKey;
  delete jobExecution.partitionKey;
  delete jobExecution.sortKey;

  callback(null, { jobExecution, result });
};
