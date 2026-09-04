// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

jest.mock('@vercel/analytics', () => ({
  inject: jest.fn(),
  track: jest.fn(),
}));

jest.mock('@vercel/blob/client', () => ({
  upload: jest.fn(),
}), { virtual: true });
