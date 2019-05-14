import PQueue from 'p-queue';
import { dynamodb, dynamodbMarshall, dynamodbUnmarshall } from '../../lib/aws_clients';
import {
  genericDecode,
  genericEncode,
  getAllPartitionKeys,
  getCommonPrefix,
  getIndexDateFields,
  getSortKeyPrefix,
  parseSortKey,
  zipPartitionKeys,
} from '../../lib/job_executions_utils';
import { paginatedMultiPartitionQuery } from '../../lib/dynamodb_utils';
import { camelCaseObj, snakeCaseObj } from '../../lib/common';

const {
  DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
  DYNAMODB_PARTITION_COUNT_JOB_EXECUTIONS: paritionCountStr,
} = process.env;

const partitionCount = parseInt(paritionCountStr);

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

    console.log(`decoded "more": ${JSON.stringify(decodedMore)}`);
    ({s: since, sn: serviceName, j: jobName, c: exclusiveStartKeys} = decodedMore);
  }

  let [indexDateStr, indexStartMs, sinceDt, sinceMs] = getIndexDateFields(since ? new Date(parseInt(since)) : null);

  if (exclusiveStartKeys) {
    exclusiveStartKeys = zipPartitionKeys(indexDateStr, exclusiveStartKeys);
  }

  const [ prevIndexDateStr, prevIndexStartMs ] = getIndexDateFields(sinceDt, -1);

  const eventTimePrefix = indexStartMs === sinceMs ? null : getCommonPrefix(indexStartMs, sinceMs);
  const sortKeyPrefix = getSortKeyPrefix(serviceName, jobName, eventTimePrefix);

  console.log(`params.since=${since}, indexStartMs=${indexStartMs}, sinceMs=${sinceMs}, eventTimePrefix=${eventTimePrefix}, exclusiveStartKeys=${JSON.stringify(exclusiveStartKeys,null,2)}`);

  const allPartitionKeys = getAllPartitionKeys(indexDateStr, partitionCount);
  const partitionKeys = exclusiveStartKeys ?
                          Object.keys(exclusiveStartKeys).filter((partitionKey) => allPartitionKeys.includes(partitionKey)) :
                          allPartitionKeys;

  console.log(`partitionKeys (${partitionCount}): ${JSON.stringify(partitionKeys)}`);

  let attrValues;
  let filterExpr;
  let keyCondition = "partitionKey = :partitionKey";
  if (sortKeyPrefix) {
     keyCondition += " AND begins_with(sortKey, :sortKeyPrefix)";
     attrValues = {
       ':sortKeyPrefix': sortKeyPrefix
     };
  }

  if (params.since) {
    if (!attrValues) {
      attrValues = {};
    }

    attrValues[':sinceMs'] = parseInt(sinceMs);
    filterExpr = 'event.timeMs >= :sinceMs';
  }

  const queryParams = {
    Limit: 10, // response will contain 0 to 10*partitionCount results per page
    TableName: DYNAMODB_TABLE_NAME_JOB_EXECUTIONS,
    ExpressionAttributeNames: {
      '#result': 'result',
      '#name': 'name',
    },
    ...attrValues && { ExpressionAttributeValues: dynamodbMarshall(attrValues) },
    ...filterExpr && { FilterExpression: filterExpr },
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
