import uuidv5 from 'uuid/v5';
import { dynamodb } from '../../lib/aws_clients';

const {
  DYNAMODB_TABLE_NAME_JOBS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  // TODO: validate, swagger!
  const {
    pathParameters: {
      service_name: serviceName,
      job_name: jobName
    }
  } = input;

  try {
    await dynamodb.updateItem({
      TableName: DYNAMODB_TABLE_NAME_JOBS,
      Key: {
        service_name: {
          S: serviceName,
        },
        job_name: {
          S: jobName,
        },
      },
      ExpressionAttributeNames: {
        '#DEL': 'deleted_at',
        '#EN': 'enabled',
      },
      ExpressionAttributeValues: {
        ':now' : {
          N: parseInt(Date.now() / 1000).toString(),
        },
        ':no': {
          BOOL: false
        },
        ':null': {
          NULL: true
        }
      },
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
