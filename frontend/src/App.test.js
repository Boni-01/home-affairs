import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

test('starts on login and only opens dashboards after login', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /home dashboard/i })).not.toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByRole('heading', { name: /home dashboard/i })).toBeInTheDocument();
});
