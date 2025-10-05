import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import PasswordResetDialog from '../PasswordResetDialog';

describe('PasswordResetDialog', () => {
  it('disables cancel button when reset is enforced', () => {
    render(
      <PasswordResetDialog
        open
        enforced
        loading={false}
        error={null}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Cancel/i })).toBeDisabled();
  });

  it('shows validation error when new passwords do not match', async () => {
    render(
      <PasswordResetDialog
        open
        enforced={false}
        loading={false}
        error={null}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText(/Current password/i), 'OldPassword123!');
    await userEvent.type(screen.getByLabelText(/^New password$/i), 'NewPassword123!');
    await userEvent.type(screen.getByLabelText(/Confirm new password/i), 'Mismatch123!');
    await userEvent.click(screen.getByRole('button', { name: /Update password/i }));

    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
  });
});
