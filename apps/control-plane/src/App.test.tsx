import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

const mockState: Record<string, any> = {};

vi.mock('./store/authStore', () => ({
  useAuthStore: (selector: (state: any) => any) => selector(mockState),
}));

describe('App', () => {
  beforeEach(() => {
    mockState.session = null;
    mockState.status = 'idle';
    mockState.error = null;
    mockState.bootstrapStatus = { bootstrapped: false, admin_count: 0, bootstrap_email: 'admin@third-eye.local' };
    mockState.loadingBootstrap = false;
    mockState.initialize = vi.fn(() => Promise.resolve());
    mockState.login = vi.fn(() => Promise.resolve());
    mockState.logout = vi.fn(() => undefined);
    mockState.loadBootstrap = vi.fn(() => Promise.resolve());
    mockState.mustResetPassword = false;
    mockState.changePassword = vi.fn(() => Promise.resolve());
    mockState.changingPassword = false;
    mockState.clearError = vi.fn(() => undefined);
  });

  it('renders login view when no session is active', async () => {
    render(<App />);
    await waitFor(() => expect(mockState.initialize).toHaveBeenCalled());
    expect(screen.getByText(/Sign in to Third Eye/i)).toBeInTheDocument();
  });

  it('renders admin console when session exists', async () => {
    mockState.session = {
      key_id: 'admin-123',
      api_key: 'secret-123',
      account: {
        id: 'admin-123',
        email: 'admin@example.com',
        display_name: 'Ops Captain',
        require_password_reset: false,
      },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ items: [], total: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ) as Response,
    );

    render(<App />);
    await waitFor(() => expect(mockState.initialize).toHaveBeenCalled());
    expect(screen.getByText(/Third Eye Admin Console/i)).toBeInTheDocument();
    expect(screen.getByText(/Ops Captain/i)).toBeInTheDocument();

    fetchSpy.mockRestore();
  });
});
