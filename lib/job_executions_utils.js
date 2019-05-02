export function getIndexDateFields (sinceDate, dayOffset) {
  const sinceDt = sinceDate || new Date();

  if (dayOffset) {
    sinceDt.setDate(sinceDt.getDate() + dayOffset);
  }

  const parsableIndexDateStr = [
    sinceDt.getFullYear(),
    (`0${sinceDt.getMonth() + 1}`).slice(-2),
    (`0${sinceDt.getDate()}`).slice(-2),
  ].join('-');

  const indexStartMs = Date.parse(parsableIndexDateStr);
  const indexDateStr = parsableIndexDateStr.replace(/-/g, '');

  return [indexDateStr, indexStartMs, sinceDt, sinceDt.getTime()];
}

export function getCommonPrefix(val1, val2) {
  const str1 = val1.toString();
  const str2 = val2.toString();

  if (str1 === str2) {
    return str1;
  }

  const chars1 = str1.split('');
  const chars2 = str2.split('');

  let prefix = "";
  for (var i = 0; i < chars1.length; i++) {
    if (chars1[i] !== chars2[i]) {
      break;
    }
    prefix += chars1[i];
  }

  return prefix;
}

export function getIndexDateStr (date) {
  const [indexDateStr] = getIndexDateFields(date)

  return indexDateStr;
}

export function getPartition (eventId, paritionCount) {
  // floats are safe up to 52 bits, 13 hex characters = 52 bits.
  // parse last 13 chars of the cloudwatch eventId guid as base16
  // to deterministically generate a number from the GUID
  return parseInt(eventId.replace(/[^0-9a-fA-F]/g, '').substr(-13),16) % paritionCount;
}

export function getPartitionKey (eventId, paritionCount) {
  const indexDateStr = getIndexDateStr();
  const partition = getPartition(eventId, parseInt(paritionCount));

  return `${indexDateStr}.p${partition}`;
}

export function getAllPartitionKeys (indexDateStr, paritionCount) {
  return Array(parseInt(paritionCount)).fill().map((_, partition) => `${indexDateStr}.p${partition}`);
}

export function getSortKey (serviceName,  jobName, eventTime, eventId) {
  if (!eventTime || !serviceName || !jobName || !eventId) {
    throw new Error("Missing required input fields for creating job execution sort key");
  }

  const eventTimeMs = (new Date(eventTime)).getTime();

  return getSortKeyPrefix(serviceName,  jobName, eventTimeMs, eventId);
}

export function getSortKeyPrefix (serviceName, jobName, eventTime, eventId) {
  let parts = [
    serviceName,
    jobName,
    eventTime,
    eventId,
  ];

  let sortKeyPrefix = "";

  const firstEmptyIndex = parts.findIndex((a) => a === undefined || a === null);
  if (firstEmptyIndex !== -1) {
    parts = parts.slice(0, firstEmptyIndex);

    if (parts.length > 0 && parts.length < 3) {
      sortKeyPrefix = ":";
    }
  }

  parts.reverse().forEach((val, i) => {
    const isLast = i+1 === parts.length;
    if (val && (isLast || parts[i+1])) {
      sortKeyPrefix = `${isLast ? '' : ':'}${val}${sortKeyPrefix}`
    }
  });

  return sortKeyPrefix;
}

export function parseSortKey(sortKey) {
  const [
    serviceName,
    jobName,
    eventTimeMs,
    eventId,
  ] = sortKey.split(':');

  return {
    serviceName,
    jobName,
    eventTimeMs,
    eventId,
  };
}

export function encodeJobExecutionKey ({partitionKey, sortKey}) {
  const version = 1;
  return Buffer.from([version, partitionKey, sortKey].join(';')).toString('base64')
}

export function decodeEncodedJobExecutionKey (encodedJobExecutionKey) {
  const decoded = Buffer.from(encodedJobExecutionKey, 'base64').toString('ascii');

  const parts = decoded.split(';');
  const version = parts.shift();

  let partitionKey;
  let sortKey;

  switch (version) {
    case 1:
    default:
      ([partitionKey, sortKey] = parts);
  }

  return {
    partitionKey,
    sortKey,
  }
}

export const jobKeyPropNames = [
  "jobName",
  "serviceName",
];

export const jobStaticExecutionRelevantPropNames = [
  ...jobKeyPropNames,
  "async",
  "exclusive",
  "invocationTarget",
  "invocationType",
  "payload",
  "ruleSchedule",
  "schedule",
  "ttlSeconds",
];

export const jobStaticPropNames = [
  ...jobKeyPropNames,
  ...jobStaticExecutionRelevantPropNames,
  "deletedAt",
  "enabled",
  "guid",
  "key",
  "payload",
  "ruleName",
];

export function splitJobStaticProps(jobProps) {
  let resp = {
    job: {},
    jobStatic: {
      key: {},
    },
  };

  return Object.entries(jobProps).reduce((acc, [k, v]) => {
    const dest = jobStaticPropNames.includes(k) ? 'jobStatic' : 'job';

    if (jobKeyPropNames.includes(k)) {
      acc.jobStatic.key[k] = v;
    }

    acc[dest][k] = v;
    return acc;
  }, resp);
}

export const jobExecutionResultPropNames = [
  "correlationId",
  "state",
  "status",
  "summary",
];

export function filterJobExecutionResult(jobExecutionResult) {
  return Object.entries(jobExecutionResult).reduce((acc, [k, v]) => {
    if (jobExecutionResultPropNames.includes(k)) {
      acc[k] = v;
    }

    return acc;
  }, {});
}

export function filterJobStaticExecutionRelevantProps(jobStaticProps) {
  return Object.entries(jobStaticProps).reduce((acc, [k, v]) => {
    if (jobStaticExecutionRelevantPropNames.includes(k)) {
      acc[k] = v;
    }

    return acc;
  }, {});
}

export function genericEncode (val) {
  const valJson = JSON.stringify(val);
  return Buffer.from(valJson).toString('base64');
}
export function genericDecode (encodedVal) {
  const valJson = Buffer.from(encodedVal, 'base64').toString('ascii');
  return JSON.parse(valJson);
}
