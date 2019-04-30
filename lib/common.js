import camelCase from 'lodash.camelcase';
import snakeCase from 'lodash.snakecase';
import mapKeys from 'lodash.mapkeys';

function camelCaseObj(object) {
  return mapKeys(object, (v, k) => camelCase(k));
}

function snakeCaseObj(object) {
  return mapKeys(object, (v, k) => snakeCase(k));
}

function filterProps(props, removeProps) {
  const filteredProps = Object.entries(props).reduce((acc, [k, v]) => {
    if (!removeProps.hasOwnProperty(k)) {
      acc[k] = v;
    }
    return acc;
  }, {});

  return filteredProps;
}

function chunkArray (arr, chunkSize = 10) {
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

export {
  camelCase,
  camelCaseObj,
  delay,
  filterProps,
  mapKeys,
  snakeCase,
  snakeCaseObj,
}
