import PQueue from 'p-queue';
import { dynamodb, dynamodbMarshall, dynamodbUnmarshall } from '../lib/aws_clients';
import {
  parsePartitionKey,
  getPartitionKey,
  getSortKey,
  getAllPartitionKeys,
  getCommonPrefix,
  getIndexDateFields,
  getSortKeyPrefix,
  zipPartitionKeys,
} from '../lib/job_executions_utils';

class JobsRepository {
  constructor({
    tableNameJobs,
    indexNameJobsGuid,
    tableNameJobExecutions,
    partitionCountJobExecutions,
    getLogger,
  }) {
    this.dynamodb = dynamodb;
    this.logger = getLogger();

    this.tableNameJobs = tableNameJobs;
    this.tableNameJobExecutions = tableNameJobExecutions;
    this.indexNameJobsGuid = indexNameJobsGuid;
    this.partitionCountJobExecutions = partitionCountJobExecutions;
  }

  async getJobByKey(jobKey) {
    const resp = await this.dynamodb.getItem({
      TableName: this.tableNameJobs,
      ConsistentRead: true,
      Key: dynamodbMarshall(jobKey),
    }).promise();

    const { Item: job } = resp;

    return job ? dynamodbUnmarshall(job) : null;
  }

  async scanJobs(serviceName) {
    let params = {
      TableName: this.tableNameJobs,
    };

    if (serviceName) {
      params = {
        ...params,
        ExpressionAttributeValues: dynamodbMarshall({
          ':serviceName': serviceName,
        }),
        FilterExpression: 'serviceName = :serviceName',
      };
    }

    const results = [];
    let resp;
    do {
      // eslint-disable-next-line no-await-in-loop
      resp = await this.dynamodb.scan(params).promise();

      if (resp.Items && resp.Items.length > 0) {
        results.push(...resp.Items.map(dynamodbUnmarshall));
      }

      if (resp.LastEvaluatedKey) {
        params.ExclusiveStartKey = resp.LastEvaluatedKey;
      }
    } while (resp.LastEvaluatedKey);

    return results;
  }

  async paginatedMultiPartitionQuery(
    queryParams,
    expressionAttributeValuesArray,
    paritionKeyAttributeValueName,
    exclusiveStartKeys,
  ) {
    const results = {};
    const lastEvalKeys = {};

    const queue = new PQueue({ autoStart: false, concurrency: 4 });

    const processResp = (resp, theseParams, partitionKey) => {
      const { Items: items, LastEvaluatedKey: lastEvalKey } = resp;

      this.logger.debug(`query resolved for ${partitionKey} (${resp.Count}/${resp.ScannedCount}): ${JSON.stringify(theseParams)}`);

      if (items.length) {
        results[partitionKey].push(...items);
      }

      if (lastEvalKey) {
        const { sortKey } = dynamodbUnmarshall(lastEvalKey);

        const { partition } = parsePartitionKey(partitionKey);

        lastEvalKeys[partition] = sortKey;
      }
    };

    for (let i = 0; i < expressionAttributeValuesArray.length; i += 1) {
      const expressionAttributeValues = expressionAttributeValuesArray[i];
      const theseParams = { ...queryParams };

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
      if (exclusiveStartKeys === undefined || (
        exclusiveStartKeys && exclusiveStartKeys[partitionKey]
      )) {
        if (exclusiveStartKeys && exclusiveStartKeys[partitionKey]) {
          theseParams.ExclusiveStartKey = dynamodbMarshall({
            partitionKey,
            sortKey: exclusiveStartKeys[partitionKey],
          });
        }

        this.logger.debug(`queuing query for ${partitionKey}: ${JSON.stringify(theseParams)}`);

        queue.add(() => {
          this.logger.debug(`running query for ${partitionKey}: ${JSON.stringify(theseParams)}`);

          return this.dynamodb.query(theseParams).promise().then(
            resp => processResp(resp, theseParams, partitionKey)).catch((err) => { throw err; });
        }, { priority: 1 });
      }
    }

    queue.start();

    this.logger.debug('waiting for queue to idle');
    await queue.onIdle();
    this.logger.debug('queue idle');

    return {
      results: [].concat(...Object.values(results)),
      pagingState: {
        queryParams,
        lastEvalKeys,
      },
    };
  }

  async lockJobByKey(jobKey, jobExecutionName) {
    const params = {
      TableName: this.tableNameJobs,
      Key: dynamodbMarshall(jobKey),
      ExpressionAttributeNames: {
        '#lockExecution': 'lockExecution',
        '#lockExpiresAt': 'lockExpiresAt',
        '#ttlSeconds': 'ttlSeconds',
      },
      ExpressionAttributeValues: dynamodbMarshall({
        ':now': parseInt(Date.now() / 1000, 10),
        ':lockExecution': jobExecutionName,
        ':nulltype': 'NULL',
        ':numtype': 'N',
      }),
      UpdateExpression: 'SET #lockExpiresAt = :now + #ttlSeconds, #lockExecution = :lockExecution',
      ConditionExpression:
        'attribute_not_exists(#lockExpiresAt) OR ' +
        'attribute_type(#lockExpiresAt, :nulltype) OR ' +
        '( attribute_type(#lockExpiresAt, :numtype) AND #lockExpiresAt < :now )',
      ReturnValues: 'ALL_NEW',
    };

    this.logger.debug(`updateItem params: ${JSON.stringify(params)}`);

    // does a consistent write to get a lock on the job
    const {
      Attributes: updated,
    } = await this.dynamodb.updateItem(params).promise();

    const updatedJob = dynamodbUnmarshall(updated);

    this.logger.addContext('updateItemParams', params);
    this.logger.addContext('updatedJob', updatedJob);
    this.logger.debug('lockJobByKey complete');

    // the input already has many of the job properties specific to the execution event,
    // but later we will need other properties from the job so add those (previous state,
    // ttl_seconds, etc)
    return updatedJob;
  }

  async insertJobExecution(executionName, serviceName, jobName, triggerEvent) {
    const {
      id: eventId,
      time: eventTime,
    } = triggerEvent;

    const partitionKey = getPartitionKey(eventId, this.partitionCountJobExecutions);
    const sortKey = getSortKey(serviceName, jobName, eventTime, eventId);

    const executionKey = {
      partitionKey,
      sortKey,
    };

    const timeMs = (new Date(eventTime)).getTime();
    const now = parseInt(Date.now() / 1000, 10);

    // try {
    await dynamodb.putItem({
      TableName: this.tableNameJobExecutions,
      ExpressionAttributeNames: {
        '#SORT': 'sortKey',
      },
      Item: dynamodbMarshall({
        event: {
          ...triggerEvent,
          timeMs,
        },
        ...executionKey,
        name: executionName,
        insertedAt: now,
        updatedAt: now,
      }),
      ConditionExpression: 'attribute_not_exists(#SORT)',
      // ReturnValues only supports ALL_OLD or NONE for putItem
    }).promise();
    // } catch (e) {
    // TODO: add error catching to the step function config
    // if (e.code === 'ConditionalCheckFailedException') {
    //   callback(null, null);
    // } else {
    // callback(e);
    // }
    //   return;
    // }


    const jobExecutionPatch = {
      key: executionKey,
      event: {
        timeMs,
      },
    };

    return jobExecutionPatch;
  }

  async updateJobExecutionCallbackTaskToken(jobExecutionKey, callbackTaskToken) {
    const { Attributes: updated } = await this.dynamodb.updateItem({
      TableName: this.tableNameJobExecutions,
      Key: dynamodbMarshall(jobExecutionKey),
      ExpressionAttributeNames: {
        '#callbackTaskToken': 'callbackTaskToken',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: dynamodbMarshall({
        ':now': parseInt(Date.now() / 1000, 10),
        ':callbackTaskToken': callbackTaskToken,
      }),
      UpdateExpression: 'SET #updatedAt = :now, #callbackTaskToken = :callbackTaskToken',
      ReturnValues: 'UPDATED_NEW',
    }).promise();

    this.logger.debug(`updatedJobExecution: ${JSON.stringify(updated)}`);

    return true;
  }

  async getJobExecutionByExecutionKey(jobExecutionKey) {
    const { Item: jobExecution } = await this.dynamodb.getItem({
      TableName: this.tableNameJobExecutions,
      ConsistentRead: true,
      Key: dynamodbMarshall(jobExecutionKey),
    }).promise();

    return dynamodbUnmarshall(jobExecution);
  }

  async getJobKeyByGuid(jobGuid) {
    // NOTE: this is an eventually consistent read
    // on a global secondary index (consistent reads
    // on GSIs are not supported)
    // Fields returned are only those projected onto the index
    // ... meaning a subsequent call to getItem is required to
    // get all of the job's fields
    const {
      Items: {
        0: job,
      },
    } = await this.dynamodb.query({
      TableName: this.tableNameJobs,
      IndexName: this.indexNameJobsGuid,
      ExpressionAttributeValues: dynamodbMarshall({
        ':guid': jobGuid,
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
  }

  async insertJob({
    async,
    deletedAt,
    enabled,
    exclusive,
    guid,
    invocationTarget,
    invocationType,
    jobName,
    payload,
    schedule,
    serviceName,
    ttlSeconds,
  }) {
    const params = {
      async,
      deletedAt,
      enabled,
      exclusive,
      guid,
      invocationTarget,
      invocationType,
      jobName,
      payload,
      schedule,
      serviceName,
      ttlSeconds,
    };

    await this.dynamodb.putItem({
      TableName: this.tableNameJobs,
      Item: dynamodbMarshall(params),
    }).promise();

    return params;
  }

  async updateJobWithExecutionResults(
    jobKey,
    jobExecutionName,
    scheduledTime,
    serviceInvokedAt,
    jobExecutionResult,
  ) {
    const params = {
      TableName: this.tableNameJobs,
      Key: dynamodbMarshall(jobKey),
      ExpressionAttributeNames: {
        '#lockExecution': 'lockExecution',
        '#lockExpiresAt': 'lockExpiresAt',
        '#updatedAt': 'updatedAt',
        '#lastSuccessfulExecution': 'lastSuccessfulExecution',
      },
      ExpressionAttributeValues: dynamodbMarshall({
        ':now': parseInt(Date.now() / 1000, 10),
        ':lockExecution': jobExecutionName,
        ':null': null,
        ':nulltype': 'NULL',
        ':lastSuccessfulExecution': {
          // should only be success results
          ...jobExecutionResult,
          name: jobExecutionName,
          scheduledTime,
          serviceInvokedAt,
        },
      }),
      UpdateExpression: 'SET #updatedAt = :now, #lockExecution = :null, #lockExpiresAt = :null, #lastSuccessfulExecution = :lastSuccessfulExecution',
      ConditionExpression: '( attribute_exists(#lockExecution) AND ( #lockExecution = :lockExecution OR attribute_type(#lockExecution, :nulltype) ) ) OR (attribute_exists(#lockExpiresAt) AND (attribute_type(#lockExpiresAt, :nulltype) OR #lockExpiresAt < :now))',
      ReturnValues: 'UPDATED_NEW',
    };

    this.logger.debug(`updateItem params: ${JSON.stringify(params)}`);

    const { Attributes: updatedJob } = await this.dynamodb.updateItem(params).promise();

    return dynamodbUnmarshall(updatedJob);
  }

  async updateJobExecutionWithExecutionResults(
    jobExecutionKey,
    serviceInvokedAt,
    jobStatic,
    jobExecutionResult,
  ) {
    const { Attributes: updatedJobExecution } = await this.dynamodb.updateItem({
      TableName: this.tableNameJobExecutions,
      Key: dynamodbMarshall(jobExecutionKey),
      ExpressionAttributeNames: {
        '#callbackTaskToken': 'callbackTaskToken',
        '#result': 'result',
        '#updatedAt': 'updatedAt',
        '#jobStatic': 'jobStatic',
      },
      ExpressionAttributeValues: dynamodbMarshall({
        ':now': parseInt(Date.now() / 1000, 10),
        ':null': null,
        ':res': {
          ...jobExecutionResult,
          serviceInvokedAt,
        },
        ':jobStatic': jobStatic,
      }),
      UpdateExpression: 'SET #updatedAt = :now, #callbackTaskToken = :null, #result = :res, #jobStatic = :jobStatic',
      ReturnValues: 'UPDATED_NEW',
    }).promise();

    return dynamodbUnmarshall(updatedJobExecution);
  }

  async softDeleteJob(jobKey) {
    try {
      await this.dynamodb.updateItem({
        TableName: this.tableNameJobs,
        Key: dynamodbMarshall(jobKey),
        ExpressionAttributeNames: {
          '#DEL': 'deletedAt',
          '#EN': 'enabled',
        },
        ExpressionAttributeValues: dynamodbMarshall({
          ':now': parseInt(Date.now() / 1000, 10),
          ':no': false,
          ':null': null,
        }),
        UpdateExpression: 'SET #DEL = :now, #EN = :no',
        ConditionExpression: '#DEL = :null',
      }).promise();
    } catch (e) {
      if (e.code !== 'ConditionalCheckFailedException') {
        throw e;
      }
    }

    return true;
  }

  async searchJobExecutions({
    since,
    serviceName,
    jobName,
    context,
  }) {
    const [
      indexDateStr,
      indexStartMs,
      sinceDt,
      sinceMs,
    ] = getIndexDateFields(since ? new Date(parseInt(since, 10)) : null);

    let exclusiveStartKeys;
    if (context) {
      exclusiveStartKeys = zipPartitionKeys(indexDateStr, context);
    }

    const [_prevIndexDateStr, prevIndexStartMs] = getIndexDateFields(sinceDt, -1);

    const eventTimePrefix = indexStartMs === sinceMs
      ? null : getCommonPrefix(indexStartMs, sinceMs);
    const sortKeyPrefix = getSortKeyPrefix(serviceName, jobName, eventTimePrefix);

    this.logger.debug(`params.since=${since}, indexStartMs=${indexStartMs}, sinceMs=${sinceMs}, eventTimePrefix=${eventTimePrefix}, exclusiveStartKeys=${JSON.stringify(exclusiveStartKeys)}`);

    const allPartitionKeys = getAllPartitionKeys(indexDateStr, this.partitionCountJobExecutions);
    const partitionKeys = exclusiveStartKeys ?
      Object.keys(exclusiveStartKeys).filter(
        partitionKey => allPartitionKeys.includes(partitionKey),
      ) :
      allPartitionKeys;

    this.logger.debug(`partitionKeys (${this.partitionCountJobExecutions}): ${JSON.stringify(partitionKeys)}`);

    let attrValues;
    let filterExpr;
    let keyCondition = 'partitionKey = :partitionKey';
    if (sortKeyPrefix) {
      keyCondition += ' AND begins_with(sortKey, :sortKeyPrefix)';
      attrValues = {
        ':sortKeyPrefix': sortKeyPrefix,
      };
    }

    if (since) {
      if (!attrValues) {
        attrValues = {};
      }

      attrValues[':sinceMs'] = parseInt(sinceMs, 10);
      filterExpr = 'event.timeMs >= :sinceMs';
    }

    const queryParams = {
      Limit: 10, // response will contain 0 to 10*partitionCount results per page
      TableName: this.tableNameJobExecutions,
      ExpressionAttributeNames: {
        '#result': 'result',
        '#name': 'name',
      },
      ...attrValues && { ExpressionAttributeValues: dynamodbMarshall(attrValues) },
      ...filterExpr && { FilterExpression: filterExpr },
      KeyConditionExpression: keyCondition,
      ProjectionExpression: '#name, event, #result, updatedAt, insertedAt, sortKey',
    };

    const expressionAttributeValuesArray = partitionKeys.map(partitionKey => ({
      ':partitionKey': { S: partitionKey },
    }));

    const {
      results,
      pagingState: {
        lastEvalKeys,
      },
    } = await this.paginatedMultiPartitionQuery(queryParams, expressionAttributeValuesArray, ':partitionKey', exclusiveStartKeys);

    const params = {
      since,
      serviceName,
      jobName,
    };

    if (Object.values(lastEvalKeys).filter(v => v).length > 0) {
      params.context = lastEvalKeys;
    } else {
      params.since = prevIndexStartMs;
    }

    return {
      params,
      results: results.map(dynamodbUnmarshall)
        .sort((a, b) => (new Date(a.event.time)).getTime() - (new Date(b.event.time)).getTime()),
    };
  }

  async searchJobsByService(serviceName) {
    return this.scanJobs(serviceName);
  }
}

module.exports = JobsRepository;
