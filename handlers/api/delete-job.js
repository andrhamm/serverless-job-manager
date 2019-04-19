import uuidv5 from 'uuid/v5';
import { dynamodb, dynamodbMarshall } from '../../lib/aws_clients';

const {
  DYNAMODB_TABLE_NAME_JOBS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  // TODO: validate, swagger!
  const {
    serviceName,
    jobName,
  } = input.pathParameters;

  try {
    await dynamodb.updateItem({
      TableName: DYNAMODB_TABLE_NAME_JOBS,
      Key: dynamodbMarshall({
        serviceName,
        jobName,
      }),
      ExpressionAttributeNames: {
        '#DEL': 'deletedAt',
        '#EN': 'enabled',
      },
      ExpressionAttributeValues: dynamodbMarshall({
        ':now' : parseInt(Date.now() / 1000),
        ':no': false,
        ':null': null,
      }),
      UpdateExpression: "SET #DEL = :now, #EN = :no",
      ConditionExpression: "#DEL = :null",
    }).promise();
  } catch (e) {
    if (e.code !== 'ConditionalCheckFailedException') {
      callback(e);
      return;
    }
  }

  callback(null,  {
    statusCode: 204,
    body: '',
  });
}
