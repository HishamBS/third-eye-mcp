import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { AdminBootstrapStatus } from '../types/admin';

interface LoginScreenProps {
  loading: boolean;
  error: string | null;
  bootstrapStatus: AdminBootstrapStatus | null;
  loadingBootstrap: boolean;
  onRefreshBootstrap: () => void;
  onSubmit: (payload: { email: string; password: string }) => Promise<void> | void;
}

function LoginScreen({
  loading,
  error,
  bootstrapStatus,
  loadingBootstrap,
  onRefreshBootstrap,
  onSubmit,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setLocalError(null);
  }, [email, password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      setLocalError('Provide both email and password');
      return;
    }
    await onSubmit({ email: email.trim(), password });
  };

  const bootstrapped = bootstrapStatus?.bootstrapped ?? false;
  const bootstrapEmail = bootstrapStatus?.bootstrap_email;

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-base px-4 py-12 text-slate-100">
      <div className="w-full max-w-lg space-y-6">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.4em] text-accent-primary">Operator Control Plane</p>
          <h1 className="text-3xl font-semibold text-white">Sign in to Third Eye</h1>
          <p className="text-sm text-slate-400">
            Authenticate with your admin email to obtain a scoped API key. Keys are stored locally and rotate when you change your password.
          </p>
        </header>

        {!bootstrapped && (
          <div className="space-y-3 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-left text-sm text-amber-200">
            <p className="font-semibold">Bootstrap required</p>
            <p>
              No admin accounts are active yet. Set the <code className="rounded bg-surface-raised px-1 py-0.5 text-xs">ADMIN_BOOTSTRAP_PASSWORD</code> secret and run
              <code className="ml-1 rounded bg-surface-raised px-1 py-0.5 text-xs">third-eye admin bootstrap</code> (or the Helm job) to provision the first admin.
            </p>
            {bootstrapEmail && (
              <p>
                The bootstrap account will use <span className="font-mono text-xs">{bootstrapEmail}</span> and require a password change on first login.
              </p>
            )}
            <button
              type="button"
              onClick={onRefreshBootstrap}
              disabled={loadingBootstrap}
              className="rounded-full border border-amber-400/70 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:border-amber-300 disabled:opacity-60"
            >
              {loadingBootstrap ? 'Checking…' : 'Re-check status'}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-6">
          <div className="space-y-2">
            <label
              htmlFor="admin-email"
              className="text-xs uppercase tracking-[0.3em] text-slate-400"
            >
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-surface-outline/60 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              placeholder="admin@third-eye.local"
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="admin-password"
              className="text-xs uppercase tracking-[0.3em] text-slate-400"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-surface-outline/60 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
              placeholder="••••••••"
              autoComplete="current-password"
              minLength={8}
              required
            />
          </div>
          {(error || localError) && (
            <p className="rounded-lg border border-accent-danger/40 bg-accent-danger/10 p-2 text-sm text-accent-danger">
              {error || localError}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-accent-primary px-4 py-2 text-sm font-semibold text-surface-base transition hover:bg-sky-400 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="text-center text-xs text-slate-400">
            Forgot your password? Ask another admin to trigger a reset via the CLI or rotate your account in the dashboard.
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginScreen;
