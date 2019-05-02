import PQueue from 'p-queue';
import { dynamodb, dynamodbMarshall, dynamodbUnmarshall } from './aws_clients';
import { chunkArray } from './common';

// export const dynamoDbSearchWithQueue = (queue, additionalParams) => {
//   const scanOrQuery = additionalParams.KeyConditionExpression ? 'query' : 'scan';
//
//   const params = {
//     Limit: 1000,
//     ...additionalParams,
//   };
//
//   let results = [];
//
//   const processResp = (resp) => {
//     if (resp.Items && resp.Items.length > 0) {
//       results.push(...resp.Items);
//     }
//
//     if (resp.LastEvaluatedKey) {
//       params.ExclusiveStartKey = resp.LastEvaluatedKey;
//
//       queue.add(() => dynamodb[scanOrQuery](params).promise()).then(processResp);
//     } else {
//       Promise.resolve(results);
//     }
//   };
//
//   queue.add(() => dynamodb[scanOrQuery](params).promise()).then(processResp);
//
//   return;
// }

// Does a `query` when KeyConditionExpression param is present, otherwise a `scan`
// Paginates through all results and runs `callback` multiple times (once per batch)
// If no callback is specified, the promise resolves with all result items
// When callback is specified, after all results are processed, promise resolves with stats about the operation
// export const dynamoDbSearch = (additionalParams, callback, batchSize) => {
//   const scanOrQuery = additionalParams.KeyConditionExpression ? 'query' : 'scan';
//
//   const params = {
//     Limit: 1000,
//     ...additionalParams,
//   };
//
//   const stats = {
//     pages: 0,
//     items: 0,
//     batches: 0,
//     batch_index: 0,
//   };
//
//   let results = [];
//
//   const processResp = (resp) => {
//     stats.pages += 1;
//     stats.items += resp.Items.length;
//
//     if (resp.Items && resp.Items.length > 0) {
//       if (!callback) {
//         results.push(...resp.Items);
//       } else {
//         if (batchSize) {
//           const chunks = chunkArray(resp.Items, batchSize);
//           stats.batches += chunks.length;
//
//           for (let i = 0; i < chunks.length; i += 1) {
//             stats.batch_index = i;
//             if (chunks[i] && chunks[i].length > 0) {
//               callback(chunks[i], stats);
//             }
//           }
//         } else {
//           // if batchSize isn't specified, don't chunk the response
//           callback(resp.Items, stats);
//         }
//       }
//     }
//
//     if (resp.LastEvaluatedKey) {
//       params.ExclusiveStartKey = resp.LastEvaluatedKey;
//
//       return dynamodb[scanOrQuery](params)
//         .promise()
//         .then(processResp);
//     }
//
//     return Promise.resolve(callback ? results : stats);
//   };
//
//   return dynamodb[scanOrQuery](params)
//     .promise()
//     .then(processResp);
// };

export const getJobKeyByGuid = async (guid, {DYNAMODB_TABLE_NAME_JOBS, DYNAMODB_INDEX_NAME_JOBS_GUID}) => {
  // NOTE: this is an eventually consistent read
  // on a global secondary index (consistent reads
  // on GSIs are not supported)
  // Fields returned are only those projected onto the index
  // ... meaning a subsequent call to getItem is required to
  // get all of the job's fields
  const {
    Items: {
      [0]: job
    }
  } = await dynamodb.query({
    TableName: DYNAMODB_TABLE_NAME_JOBS,
    IndexName: DYNAMODB_INDEX_NAME_JOBS_GUID,
    ExpressionAttributeValues: dynamodbMarshall({
      ':guid' : guid
    }),
    KeyConditionExpression: 'guid = :guid',
    Limit: 1,
  }).promise();

  if (!job) {
    return null;
  }

  const {
    serviceName,
    jobName,
  } = dynamodbUnmarshall(job);

  return {
    serviceName,
    jobName,
  };
};

export const getJob = async (jobKey, {DYNAMODB_TABLE_NAME_JOBS}) => {
  const resp = await dynamodb.getItem({
    TableName: DYNAMODB_TABLE_NAME_JOBS,
    ConsistentRead: true,
    Key: dynamodbMarshall(jobKey),
  }).promise();

  console.log(`getItem resp: ${JSON.stringify(resp, null, 2)}`);

  const { Item: job } = resp;

  return job ? dynamodbUnmarshall(job) : null;
}

export const scanJobs = async (serviceName, {DYNAMODB_TABLE_NAME_JOBS}) => {
  let params = {
    TableName: DYNAMODB_TABLE_NAME_JOBS,
  };

  if (serviceName) {
    params = {
      ...params,
      ExpressionAttributeValues: dynamodbMarshall({
        ':serviceName': serviceName,
      }),
      FilterExpression: `serviceName = :serviceName`,
    };
  }

  let results = [];
  let resp;
  do {
    resp = await dynamodb.scan(params).promise();

    if (resp.Items && resp.Items.length > 0) {
      results.push(...resp.Items.map(dynamodbUnmarshall));
    }

    if (resp.LastEvaluatedKey) {
      params.ExclusiveStartKey = resp.LastEvaluatedKey;
    }
  } while (resp.LastEvaluatedKey);

  return results;
}

// Assumes values in expressionAttributeValuesArray will not change between paginated page loads
// i.e. pass the same
export async function paginatedMultiPartitionQuery (queryParams, expressionAttributeValuesArray, paritionKeyAttributeValueName, exclusiveStartKeys) {
  let results = {};
  let lastEvalKeys = {};

  const queue = new PQueue({ autoStart: false, concurrency: 4 });

  const processResp = (resp, theseParams, partitionKey) => {
    const {Items: items, LastEvaluatedKey: lastEvalKey } = resp;

    console.log(`query resolved for ${partitionKey} (${resp.Count}/${resp.ScannedCount}): ${JSON.stringify(theseParams, null, 2)}`);

    if (items.length) {
      results[partitionKey].push(...items);
    }

    lastEvalKeys[partitionKey] = lastEvalKey;
  };

  for (var i = 0; i < expressionAttributeValuesArray.length; i++) {
    const expressionAttributeValues = expressionAttributeValuesArray[i];
    const theseParams = {...queryParams};

    const partitionKey = expressionAttributeValues[paritionKeyAttributeValueName].S;
    if (!results[partitionKey]) {
      results[partitionKey] = [];
    }

    theseParams.ExpressionAttributeValues = {
      ...theseParams.ExpressionAttributeValues,
      ...expressionAttributeValues,
    };

    // if `exclusiveStartKeys` was passed, this is a pagination request (page 2+)
    // only do the query if the last request had a lastEvalKey or if this is the
    // first request
    if (exclusiveStartKeys === undefined || (exclusiveStartKeys && exclusiveStartKeys[partitionKey])) {
      if (exclusiveStartKeys && exclusiveStartKeys[partitionKey]) {
        theseParams.ExclusiveStartKey = exclusiveStartKeys[partitionKey];
      }

      console.log(`queuing query for ${partitionKey}: ${JSON.stringify(theseParams, null, 2)}`);

      queue.add(() => {
        console.log(`running query for ${partitionKey}: ${JSON.stringify(theseParams, null, 2)}`);

        return dynamodb.query(theseParams).promise().then((resp) => processResp(resp, theseParams, partitionKey)).catch((err) => {throw err;});
      }, { priority: 1 });
    }
  }

  queue.start();

  console.log(`waiting for queue to idle`);
  await queue.onIdle();
  console.log(`queue idle`);

  return {
    results: [].concat(...Object.values(results)),
    pagingState: {
      queryParams,
      lastEvalKeys,
    },
  }
}
