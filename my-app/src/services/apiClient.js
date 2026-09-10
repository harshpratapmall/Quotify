import { apiUrl } from '../config/api';

const defaultOptions = {
  credentials: 'include',
};

export const request = (path, options = {}) =>
  fetch(apiUrl(path), {
    ...defaultOptions,
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

const parseResponseBody = async (response) => {
  if (typeof response.text === 'function') {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  if (typeof response.json === 'function') {
    return response.json();
  }

  return null;
};

export const requestJson = async (path, options = {}) => {
  const response = await request(path, options);
  const data = await parseResponseBody(response);
  return { response, data };
};

// apiRequest sends an optional JSON body as application/json.
export const apiRequest = async (method, path, body) => {
  const options = { method };
  if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  return requestJson(path, options);
};

// apiList fetches an array endpoint and returns [] for failed or non-array bodies.
export const apiList = async (path) => {
  const { response, data } = await requestJson(path);
  return response.ok && Array.isArray(data) ? data : [];
};
