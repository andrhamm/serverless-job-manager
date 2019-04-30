import PQueue from 'p-queue';
import { dynamodb, dynamodbMarshall, dynamodbUnmarshall } from '../../lib/aws_clients';
import { getIndexDateFields, getSortKeyPrefix, getAllPartitionKeys, getCommonPrefix, parseSortKey, genericEncode, genericDecode } from '../../lib/job_executions_utils';
import { paginatedMultiPartitionQuery } from '../../lib/dynamodb_utils';
import { camelCaseObj, snakeCaseObj } from '../../lib/common';

const {
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
  DYNAMODB_PARTITION_COUNT_JOB_EXECUTIONS,
} = process.env;

export const handler = async (input, context, callback) => {
  console.log('event: ' + JSON.stringify(input, null, 2));

  const {
    resource,
    pathParameters,
    multiValueQueryStringParameters,
    queryStringParameters,
    body: bodyJson,
  } = input;

  const body = camelCaseObj(JSON.parse(bodyJson || '{}'));
  const params = camelCaseObj(queryStringParameters || {});
  const multiParams = camelCaseObj(multiValueQueryStringParameters || {});
  let {
    since,
    serviceName,
    jobName,
  } = params;
  let exclusiveStartKeys;

  if (body.more) {
    const decodedMore = genericDecode(body.more);

    console.log(`body.more=${body.more} decodedMore=${JSON.stringify(decodedMore)}`);
    ({s: since, sn: serviceName, j: jobName, c: exclusiveStartKeys} = decodedMore);
  }

  const sinceDt = since ? new Date(since) : null;
  const [indexDateStr, indexStartMs, indexDate] = getIndexDateFields(sinceDt);

  // const [ nextIndexDateStr, nextIndexStartMs ] = getIndexDateFields(indexDate, 1);
  const [ prevIndexDateStr, prevIndexStartMs ] = getIndexDateFields(indexDate, -1);

  const sinceMs = sinceDt ? sinceDt.getTime() : indexStartMs;

  const eventTimePrefix = indexStartMs === sinceMs ? null : getCommonPrefix(indexStartMs, sinceMs);
  const sortKeyPrefix = getSortKeyPrefix(serviceName, jobName, eventTimePrefix);

  console.log(`params.since=${since}, indexStartMs=${indexStartMs}, sinceMs=${sinceMs}, eventTimePrefix=${eventTimePrefix}, exclusiveStartKeys=${exclusiveStartKeys}`);
  const allPartitionKeys = getAllPartitionKeys(indexDateStr, DYNAMODB_PARTITION_COUNT_JOB_EXECUTIONS);
  const partitionKeys = exclusiveStartKeys ? Object.keys(exclusiveStartKeys).filter((v) => allPartitionKeys.include(v)) : allPartitionKeys;

  console.log(`partitionKeys (${DYNAMODB_PARTITION_COUNT_JOB_EXECUTIONS}): ${JSON.stringify(partitionKeys)}`);

  let keyCondition = "partitionKey = :partitionKey";
  if (sortKeyPrefix) {
     keyCondition += " AND begins_with(sortKey, :sortKeyPrefix)";
  }

  const queryParams = {
    TableName: DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
    ExpressionAttributeNames: {
      '#result': 'result',
      '#name': 'name',
      // '#eventTimeMs': 'event.timeMs',
    },
    ExpressionAttributeValues: dynamodbMarshall({
      // ':sinceMs': parseInt(sinceMs),
      ...sortKeyPrefix && {':sortKeyPrefix': sortKeyPrefix},
    }),
    // TODO: add filter expression for date filtering
    // FilterExpression: '#eventTimeMs >= :sinceMs',
    KeyConditionExpression: keyCondition,
    ProjectionExpression: '#name, event, #result, updatedAt, insertedAt, sortKey',
  };

  const expressionAttributeValuesArray = partitionKeys.map((partitionKey) => {
    return {
      ':partitionKey': { S: partitionKey }
    };
  });

  const {
    results,
    pagingState: {
      lastEvalKeys
    },
  } = await paginatedMultiPartitionQuery(queryParams, expressionAttributeValuesArray, ':partitionKey', exclusiveStartKeys);

  let moreParams = {
    s: since,
    sn: serviceName,
    j: jobName,
  };

  if (Object.values(lastEvalKeys).filter((v) => v).length > 0) {
    moreParams.c = lastEvalKeys;
  } else {
    moreParams.s = prevIndexStartMs;
  }

  const response = {
    count: results.length,
    since: sinceMs,
    paging: {
      more: genericEncode(moreParams),
    },
    // TODO: filter response
    results: results.map(dynamodbUnmarshall).map((result) => {
      // polyfill jobName and serviceName (remove later)
      const { jobName, serviceName } = parseSortKey(result.sortKey);

      let parsedExecution = snakeCaseObj({...result, jobName, serviceName});
      let parsedEvent = snakeCaseObj(result.event);
      let parsedResult = snakeCaseObj(result.result);
      parsedExecution.event = parsedEvent;
      parsedExecution.result = parsedResult;

      return parsedExecution;
    }).sort(function(a, b) {
      return (new Date(a.event.time)).getTime() - (new Date(b.event.time)).getTime();
    }),
  };

  callback(null,  {
    statusCode: 200,
    body: JSON.stringify(response, null, 2),
  });
}
