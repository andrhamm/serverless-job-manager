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

export function getSortKey (jobInput) {
  const {
    eventTime,
    serviceName,
    jobName,
    eventId,
  } = jobInput;

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

export function encodeExecutionKey ({partitionKey, sortKey}) {
  const version = 1;
  return Buffer.from([version, partitionKey, sortKey].join(';')).toString('base64')
}

export function decodeEncodedExecutionKey (encodedExecutionKey) {
  const decoded = Buffer.from(encodedExecutionKey, 'base64').toString('ascii');

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
