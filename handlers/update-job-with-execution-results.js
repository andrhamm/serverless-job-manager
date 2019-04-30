import { dynamodb, dynamodbMarshall, dynamodbUnmarshall } from '../lib/aws_clients';

const {
  DYNAMODB_TABLE_NAME_JOBS,
} = process.env;

export const handler = async (inputs, context, callback) => {
  console.log('event: ' + JSON.stringify(inputs, null, 2));
  const input = Object.assign({}, ...inputs);

  const {
    jobStatic: {
      serviceName,
      jobName,
      exclusive,
      key: jobKey,
    },
    jobExecution: {
      name: jobExecutionName,
      event: {
        time: eventTime,
      },
      serviceInvokedAt,
    },
    jobExecutionResult,
  } = input;

  let updatedJob = {};

  if (exclusive) {
    const params = {
      TableName: DYNAMODB_TABLE_NAME_JOBS,
      Key: dynamodbMarshall(jobKey),
      ExpressionAttributeNames: {
        '#lockExecution': 'lockExecution',
        '#lockExpiresAt': 'lockExpiresAt',
        '#updatedAt': 'updatedAt',
        '#lastSuccessfulExecution': 'lastSuccessfulExecution',
      },
      ExpressionAttributeValues: dynamodbMarshall({
        ':now': parseInt(Date.now() / 1000),
        ':lockExecution': jobExecutionName,
        ':null': null,
        ':nulltype': 'NULL',
        ':lastSuccessfulExecution': {
          ...jobExecutionResult,
          name: jobExecutionName,
          scheduledTime: eventTime,
          serviceInvokedAt,
        },
      }),
      UpdateExpression: `SET #updatedAt = :now, #lockExecution = :null, #lockExpiresAt = :null, #lastSuccessfulExecution = :lastSuccessfulExecution`,
      ConditionExpression: `( attribute_exists(#lockExecution) AND ( #lockExecution = :lockExecution OR attribute_type(#lockExecution, :nulltype) ) ) OR (attribute_exists(#lockExpiresAt) AND (attribute_type(#lockExpiresAt, :nulltype) OR #lockExpiresAt < :now))`,
      ReturnValues: 'UPDATED_NEW',
    };

    console.log(`updateItem params: ${JSON.stringify(params, null, 2)}`);

    ({ Attributes: updatedJob } = await dynamodb.updateItem(params).promise());

    updatedJob = dynamodbUnmarshall(updatedJob);
  }

  callback(null, updatedJob);
}
