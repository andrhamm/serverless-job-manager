import { dynamodb } from '../lib/aws_clients';

const {
  DYNAMODB_TABLE_NAME_JOBS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    jobName,
    serviceName,
    executionName,
  } = input;

  try {
    // does a consistent write to get a lock on the job
    const {
      Attributes: job
    } = await dynamodb.updateItem({
      TableName: DYNAMODB_TABLE_NAME_JOBS,
      Key: {
        service_name: {
          S: serviceName,
        },
        job_name: {
          S: jobName,
        }
      },
      ExpressionAttributeNames: {
        '#LEX': 'lock_execution',
        '#LEA': 'lock_expires_at',
        '#TTL': 'ttl_seconds',
      },
      ExpressionAttributeValues: {
        ':now' : {
          N: parseInt(Date.now() / 1000).toString(),
        },
        ':lex': {
          S: executionName
        },
      },
      UpdateExpression: "SET #LEA = :now + #TTL, #LEX = :lex",
      ConditionExpression: "attribute_not_exists(#LEA) OR (attribute_exists(#LEA) AND #LEA < :now)",
      ReturnValues: 'ALL_NEW',
    }).promise();

    callback(null, {
      ...input,
      job,
    })
  } catch (e) {
    if (e.code !== 'ConditionalCheckFailedException') {
      callback(e);
      return;
    }
  }
};
