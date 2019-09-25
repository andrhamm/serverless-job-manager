import axios from 'axios';

export const makeGetHttpClient = ({ apiBaseUrl }) => function getHttpClient() {
  const instance = axios.create({
    baseURL: apiBaseUrl,
  });

  return instance;
};
