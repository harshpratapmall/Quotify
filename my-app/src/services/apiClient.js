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
