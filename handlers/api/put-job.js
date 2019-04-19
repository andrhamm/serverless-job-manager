import uuidv5 from 'uuid/v5';
import { dynamodb, dynamodbMarshall, dynamodbUnmarshall } from '../../lib/aws_clients';
import { camelCaseObj, snakeCaseObj } from '../../lib/common';

const {
  DYNAMODB_TABLE_NAME_JOBS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  // TODO: validate, swagger!
  const {
    pathParameters,
    body: bodyJson
  } = input;

  const body = JSON.parse(bodyJson);
  const {
    serviceName,
    jobName,
  } = pathParameters;

  let {
    invocationType,
    invocationTarget,
    ttlSeconds,
    async,
    enabled,
    exclusive, // each execution must obtain a lock (concurrency=1)
    payload, // static data to send along with the job, template vars in future
    schedule, // the cloudwatch logs schedule expression (cron or rate)
  } = camelCaseObj(body);

  let statusCode = 400;
  let headers = {'Content-Type': 'application/json'};

  if (schedule === undefined) {
    return {
      statusCode, headers, body: `{"message":"Missing schedule"}`,
    };
  }
  if (invocationType === undefined || !['http'].includes(invocationType)) {
    return {
      statusCode, headers, body: `{"message":"Missing invocation_type"}`,
    };
  }
  if (invocationTarget === undefined) {
    return {
      statusCode, headers, body: `{"message":"Missing invocation_target"}`,
    };
  }
  exclusive = exclusive === undefined ? true : !!exclusive;
  if (payload === undefined) {
    payload = "{}";
  }

  if (isNaN(parseInt(ttlSeconds))) {
    return {
      statusCode, headers, body: `{"message":"Invalid ttl_seconds"}`,
    };
  } else {
    ttlSeconds = Math.max(parseInt(ttlSeconds || 0), 60);
  }

  enabled = !!enabled;
  async = !!async;
  exclusive = !!exclusive;

  // schedule: cron(0 12 * * ? *)
  // payload: "{\"foo\": \"bar\"}"
  // invocation_type: http
  // invocation_target: http://poi-serv/v1/job_webhooks
  // async: true
  // enabled: true
  // exclusive: true

  // deterministic uuid
  const guid = uuidv5([serviceName, jobName].join('--'), uuidv5.URL);
  const deletedAt = null;

  try {
    await dynamodb.putItem({
      TableName: DYNAMODB_TABLE_NAME_JOBS,
      Item: dynamodbMarshall({
        serviceName,
        jobName,
        guid,
        ttlSeconds,
        invocationType,
        invocationTarget,
        payload,
        schedule,
        async,
        enabled,
        exclusive,
        deletedAt,
      })
    }).promise();
  } catch (e) {
    callback(e);
    return;
  }

  const job = await dynamodb.getItem({
    TableName: DYNAMODB_TABLE_NAME_JOBS,
    ConsistentRead: true,
    Key: dynamodbMarshall({
      serviceName,
      jobName,
    }),
  }).promise();

  callback(null,  {
    statusCode: 201,
    headers,
    body: JSON.stringify(snakeCaseObj(dynamodbUnmarshall(job.Item)), null, 2),
  });
}
