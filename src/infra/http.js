import fetch from 'node-fetch';

export const makeGetHttpClient = () => function getHttpClient() {
  return fetch;
};
