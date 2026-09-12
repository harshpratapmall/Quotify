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

test('renders the Business Desk login screen', async () => {
  render(<App />);
  expect(await screen.findByAltText(/Business Desk/i)).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
});
