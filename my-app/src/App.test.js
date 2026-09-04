import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
    })
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

test('renders the Quotify login screen', async () => {
  render(<App />);
  expect(await screen.findByAltText(/Quotify/i)).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
});
