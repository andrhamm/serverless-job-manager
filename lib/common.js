import camelCase from 'lodash.camelcase';
import snakeCase from 'lodash.snakecase';
import mapKeys from 'lodash.mapkeys';

function camelCaseObj(object) {
  return mapKeys(object, (v, k) => camelCase(k));
}

function snakeCaseObj(object) {
  return mapKeys(object, (v, k) => snakeCase(k));
}

export {
  camelCase,
  snakeCase,
  mapKeys,
  snakeCaseObj,
  camelCaseObj,
}
