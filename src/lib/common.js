import camelCase from 'lodash.camelcase';
import mapKeys from 'lodash.mapkeys';
import snakeCase from 'lodash.snakecase';

function camelCaseObj(object) {
  return mapKeys(object, (v, k) => camelCase(k));
}

function snakeCaseObj(object) {
  return mapKeys(object, (v, k) => snakeCase(k));
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

export {
  camelCase,
  camelCaseObj,
  chunkArray,
  delay,
  filterProps,
  mapKeys,
  snakeCase,
  snakeCaseObj,
};
