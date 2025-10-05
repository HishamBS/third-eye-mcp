import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

interface PasswordResetDialogProps {
  open: boolean;
  enforced: boolean;
  loading: boolean;
  error: string | null;
  onSubmit: (payload: { oldPassword: string; newPassword: string }) => Promise<void> | void;
  onClose: () => void;
}

function PasswordResetDialog({
  open,
  enforced,
  loading,
  error,
  onSubmit,
  onClose,
}: PasswordResetDialogProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLocalError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!oldPassword || !newPassword) {
      setLocalError('Provide both your current and new password.');
      return;
    }
    if (newPassword.length < 12) {
      setLocalError('New password must be at least 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    try {
      await onSubmit({ oldPassword, newPassword });
      setLocalError(null);
    } catch (err) {
      if (err instanceof Error) {
        setLocalError(err.message);
      } else {
        setLocalError('Failed to change password');
      }
    }
  };

  const canDismiss = !enforced && !loading;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg space-y-4 rounded-2xl border border-surface-outline/80 bg-surface-base p-6 text-slate-100 shadow-xl"
      >
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.3em] text-accent-primary">Security</p>
          <h2 className="text-2xl font-semibold text-white">{enforced ? 'Reset password to continue' : 'Change password'}</h2>
          <p className="text-sm text-slate-400">
            Password resets immediately rotate your admin API key and invalidate any existing browser sessions.
          </p>
        </header>

        <div className="grid gap-4">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Current password</span>
            <input
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              className="rounded-lg border border-surface-outline/60 bg-surface-raised px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="rounded-lg border border-surface-outline/60 bg-surface-raised px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              autoComplete="new-password"
              minLength={12}
              required
              disabled={loading}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400">Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="rounded-lg border border-surface-outline/60 bg-surface-raised px-3 py-2 text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              autoComplete="new-password"
              minLength={12}
              required
              disabled={loading}
            />
          </label>
        </div>

        {(error || localError) && (
          <p className="rounded-lg border border-accent-danger/40 bg-accent-danger/10 p-2 text-sm text-accent-danger">
            {error || localError}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={!canDismiss}
            className="rounded-full border border-surface-outline/60 px-4 py-2 text-slate-200 transition hover:border-accent-primary hover:text-accent-primary disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-full bg-accent-primary px-4 py-2 font-semibold text-surface-base transition hover:bg-sky-400 disabled:opacity-60"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default PasswordResetDialog;
