const API_BASE_URLS = {
  local: 'http://localhost:8000',
  development: 'https://quotify-i62o.onrender.com',
  production: 'https://quotify-i62o.onrender.com',
};

const hostnameEnvironment = {
  localhost: 'local',
  '127.0.0.1': 'local',
  'dev-quotify.intermesh.net': 'development',
  'quotify.intermesh.net': 'production',
  'quotify-net.vercel.app': 'production',
};

const configuredEnvironment = process.env.REACT_APP_ENV;
const hostname = window.location.hostname;
const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
const environment = isLocalHost
  ? 'local'
  : (configuredEnvironment === 'development' || configuredEnvironment === 'production'
    ? configuredEnvironment
    : hostnameEnvironment[hostname] || 'production');

export const apiBaseUrl = API_BASE_URLS[environment];

export const apiUrl = (path) => `${apiBaseUrl}${path}`;
