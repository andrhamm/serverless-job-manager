export function getIndexDate (date) {
  const dt = date || new Date();
  const indexDate = [
    dt.getFullYear(),
    (`0${dt.getMonth() + 1}`).slice(-2),
    (`0${dt.getDate()}`).slice(-2),
  ].join('');

  return indexDate;
}

export function getPartition (eventId, paritionCount) {
  // floats are safe up to 52 bits, 13 hex characters = 52 bits.
  // parse last 13 chars of the cloudwatch eventId guid as base16
  // to deterministically generate a number from the GUID
  return parseInt(eventId.replace(/[^0-9a-fA-F]/g, '').substr(-13),16) % paritionCount;
}

export function getPartitionKey (eventId, paritionCount) {
  const indexDate = getIndexDate();
  const partition = getPartition(eventId, paritionCount);

  return `${indexDate}.p${partition}`;
}

export function getSortKey (serviceName,  jobName, eventTime, eventId) {
  if (!eventTime || !serviceName || !jobName || !eventId) {
    throw new Error("Missing required input fields for creating job execution sort key");
  }

  const eventTimeMs = (new Date(eventTime)).getTime();

  const sortKey = [
    serviceName,
    jobName,
    eventTimeMs,
    eventId,
  ].join(':');

  return sortKey;
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

export const jobStaticPropNames = [
  ...jobKeyPropNames,
  "async",
  "deletedAt",
  "enabled",
  "exclusive",
  "guid",
  "invocationTarget",
  "invocationType",
  "key",
  "payload",
  "ruleName",
  "ruleSchedule",
  "schedule",
  "ttlSeconds",
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
