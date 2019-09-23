import axios from 'axios';

export const makeGetHttpClient = ({apiBaseUrl}) => {
  return function getHttpClient() {
    const instance = axios.create({
      baseURL: `https://${apiBaseUrl}/`,
    });

    return instance;
  }
};