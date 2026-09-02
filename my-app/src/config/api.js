const API_BASE_URLS = {
  local: 'http://localhost:8000',
  development: 'https://go-gin-quotify.onrender.com',
  production: 'https://go-gin-quotify.onrender.com',
};

const hostnameEnvironment = {
  localhost: 'local',
  '127.0.0.1': 'local',
  'dev-quotify.intermesh.net': 'development',
  'quotify.intermesh.net': 'production',
};

const configuredEnvironment = process.env.REACT_APP_ENV;
const environment = API_BASE_URLS[configuredEnvironment]
  ? configuredEnvironment
  : hostnameEnvironment[window.location.hostname] || 'local';

export const apiBaseUrl = API_BASE_URLS[environment];

export const apiUrl = (path) => `${apiBaseUrl}${path}`;
