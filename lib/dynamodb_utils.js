import { chunkArray } from './common';

// Does a `query` when KeyConditionExpression param is present, otherwise a `scan`
// Paginates through all results and runs `callback` multiple times (once per batch)
// If no callback is specified, the promise resolves with all result items
// When callback is specified, after all results are processed, promise resolves with stats about the operation
export const dynamoDbSearch = (additionalParams, callback, batchSize) => {
  const scanOrQuery = additionalParams.KeyConditionExpression ? 'query' : 'scan';

  const params = {
    Limit: 1000,
    ...additionalParams,
  };

  const stats = {
    pages: 0,
    items: 0,
    batches: 0,
    batch_index: 0,
  };

  let results = [];

  const processResp = (resp) => {
    stats.pages += 1;
    stats.items += resp.Items.length;

    if (resp.Items && resp.Items.length > 0) {
      if (callback) {
        results.push(...resp.Items);
      } else {
        if (batchSize) {
          const chunks = chunkArray(resp.Items, batchSize);
          stats.batches += chunks.length;

          for (let i = 0; i < chunks.length; i += 1) {
            stats.batch_index = i;
            if (chunks[i] && chunks[i].length > 0) {
              callback(chunks[i], stats);
            }
          }
        } else {
          // if batchSize isn't specified, don't chunk the response
          callback(resp.Items, stats);
        }
      }
    }

    if (resp.LastEvaluatedKey) {
      params.ExclusiveStartKey = resp.LastEvaluatedKey;

      return dynamodb[scanOrQuery](params)
        .promise()
        .then(processResp);
    }

    return Promise.resolve(callback ? results : stats);
  };

  return dynamodb[scanOrQuery](params)
    .promise()
    .then(processResp);
};
