import uuidv5 from 'uuid/v5';
import { dynamodb, dynamodbUnmarshall } from '../../lib/aws_clients';

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
    },
    body: bodyJson
  } = input;

  const body = JSON.parse(bodyJson);

  let {
    invocation_type: invocationType,
    invocation_target: invocationTarget,
    ttl_seconds: ttlSeconds,
    async,
    enabled,
    exclusive, // each execution must obtain a lock (concurrency=1)
    payload, // static data to send along with the job, template vars in future
    schedule, // the cloudwatch logs schedule expression (cron or rate)
  } = body;

  let statusCode = 400;
  let headers = {'Content-Type': 'application/json'};

  if (schedule === undefined) {
    return {
      statusCode, headers, body: "{\"message\":\"'Missing schedule'\"}",
    };
  }
  if (invocationType === undefined || !['http'].includes(invocationType)) {
    return {
      statusCode, headers, body: "{\"message\":\"'Missing or invalid invocation_type'\"}",
    };
  }
  if (invocationTarget === undefined) {
    return {
      statusCode, headers, body: "{\"message\":\"'Missing invocation_target'\"}",
    };
  }
  exclusive = exclusive === undefined ? true : !!exclusive;
  if (payload === undefined) {
    payload = "{}";
  }
  if (ttlSeconds === undefined) {
    ttlSeconds = 60;
  } else if (isNaN(parseInt(ttlSeconds))) {
    return {
      statusCode, headers, body: "{\"message\":\"'Invalid ttl_seconds'\"}",
    };
  } else {
    ttlSeconds = parseInt(ttlSeconds);
  }

  // schedule: cron(0 12 * * ? *)
  // payload: "{\"foo\": \"bar\"}"
  // invocation_type: http
  // invocation_target: http://poi-serv/v1/job_webhooks
  // async: true
  // enabled: true
  // exclusive: true

  try {
    await dynamodb.putItem({
      TableName: DYNAMODB_TABLE_NAME_JOBS,
      Item: {
        service_name: {
          S: serviceName,
        },
        job_name: {
          S: jobName,
        },
        guid: {
          // deterministic uuid
          S: uuidv5([serviceName, jobName].join('--'), uuidv5.URL),
        },
        ttl_seconds: {
          N: Math.max(ttlSeconds, 60).toString(),
        },
        invocation_type: {
          S: invocationType,
        },
        invocation_target: {
          S: invocationTarget,
        },
        payload: {
          S: payload,
        },
        schedule: {
          S: schedule,
        },
        async: {
          BOOL: !!async,
        },
        enabled: {
          BOOL: !!enabled,
        },
        exclusive: {
          BOOL: !!exclusive,
        },
        deleted_at: {
          NULL: true
        },
      },
    }).promise();
  } catch (e) {
    callback(e);
    return;
  }

  const job = await dynamodb.getItem({
    TableName: DYNAMODB_TABLE_NAME_JOBS,
    ConsistentRead: true,
    Key: {
      service_name: {
        S: serviceName,
      },
      job_name: {
        S: jobName,
      },
    },
  }).promise();

  callback(null,  {
    statusCode: 201,
    headers,
    body: JSON.stringify(dynamodbUnmarshall(job.Item), null, 2),
  });
}
