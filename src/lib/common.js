import camelCase from 'lodash.camelcase';
import snakeCase from 'lodash.snakecase';
import isPlainObject from 'lodash.isplainobject';

function deepChangeKeyCase(value, fn) {
  if (Array.isArray(value)) {
    return value.map(v => deepChangeKeyCase(v, fn));
  } else if (isPlainObject(value)) {
    return Object.entries(value).reduce((acc, [k, v]) => {
      acc[fn(k)] = deepChangeKeyCase(v, fn);
      return acc;
    }, {});
  }
  return value;
}

function camelCaseObj(value) {
  return deepChangeKeyCase(value, camelCase);
}

function snakeCaseObj(value) {
  return deepChangeKeyCase(value, snakeCase);
}

function filterProps(props, removeProps) {
  const filteredProps = Object.entries(props).reduce((acc, [k, v]) => {
    // eslint-disable-next-line no-prototype-builtins
    if (!removeProps.hasOwnProperty(k)) {
      acc[k] = v;
    }
    return acc;
  }, {});

  return filteredProps;
}

function chunkArray(arr, chunkSize = 10) {
  const tempArray = [];
  let i;
  let j;

  for (i = 0, j = arr.length; i < j; i += chunkSize) {
    tempArray.push(arr.slice(i, i + chunkSize));
  }
  return tempArray;
}

function delay(delayMs) {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

function requireJson(headers) {
  const contentType = 'application/json';

  // API Gateway doesn't let you require a specific content-type, so if
  // it is not json, the jsonschema validation will not have been applied
  if (!Object.entries(headers).find(([k, v]) => (
    k.toLowerCase() === 'content-type' && v.startsWith(contentType)
  ))) {
    return {
      statusCode: 415,
      headers: { 'Content-Type': contentType },
      body: `{"message":"Invalid content-type. Must begin with \\"${contentType}\\""}`,
    };
  }

  return null;
}

export {
  camelCase,
  camelCaseObj,
  chunkArray,
  delay,
  filterProps,
  requireJson,
  snakeCase,
  snakeCaseObj,
};
