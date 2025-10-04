import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import LoginScreen from '../LoginScreen';

const defaultBootstrap = {
  bootstrapped: false,
  admin_count: 0,
  bootstrap_email: 'admin@third-eye.local',
};

describe('LoginScreen', () => {
  it('renders bootstrap instructions when repository is not bootstrapped', async () => {
    const refresh = vi.fn();
    render(
      <LoginScreen
        loading={false}
        error={null}
        bootstrapStatus={defaultBootstrap}
        loadingBootstrap={false}
        onRefreshBootstrap={refresh}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText(/Bootstrap required/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Re-check status/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('submits credentials when email and password provided', async () => {
    const submit = vi.fn().mockResolvedValue(undefined);
    render(
      <LoginScreen
        loading={false}
        error={null}
        bootstrapStatus={{ ...defaultBootstrap, bootstrapped: true }}
        loadingBootstrap={false}
        onRefreshBootstrap={vi.fn()}
        onSubmit={submit}
      />,
    );

    await userEvent.type(screen.getByLabelText(/Email/i), 'ops@example.com');
    await userEvent.type(screen.getByLabelText(/Password/i), 'Password123!');
    await userEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(submit).toHaveBeenCalledWith({ email: 'ops@example.com', password: 'Password123!' });
  });
});
