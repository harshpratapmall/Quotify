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

test('keeps an administrator in the admin-only workspace', async () => {
  window.history.replaceState({}, '', '/quotations');
  global.fetch = jest.fn((url) => Promise.resolve({
    ok: true,
    text: async () => (String(url).includes('/auth/me')
      ? JSON.stringify({ user: { id: 'admin-1', username: 'admin', displayName: 'Admin User', role: 'admin' }, expiresAt: Math.floor(Date.now() / 1000) + 3600 })
      : '[]'),
  }));

  render(<App />);

  expect(await screen.findByRole('heading', { name: /user management/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /back to overview/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/saved quotations/i)).not.toBeInTheDocument();
  expect(window.location.pathname).toBe('/admin/users');
});
