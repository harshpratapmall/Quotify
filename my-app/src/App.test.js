import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Door2Door login screen', () => {
  render(<App />);
  expect(screen.getByAltText(/Door2Door Experts/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
});
