import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import PasswordResetDialog from './components/PasswordResetDialog';
import ApiKeysPage from './pages/ApiKeysPage';
import MetricsPage from './pages/MetricsPage';
import AuditPage from './pages/AuditPage';
import ModelsPage from './pages/ModelsPage';
import PersonasPage from './pages/PersonasPage';
import SettingsPage from './pages/SettingsPage';
import TenantsPage from './pages/TenantsPage';
import { useAuthStore } from './store/authStore';
import type { AdminAuthSession } from './types/admin';

interface AppShellProps {
  session: AdminAuthSession;
  mustResetPassword: boolean;
  onLogout: () => void;
  onChangePassword: () => void;
}

function AppShell({ session, mustResetPassword, onLogout, onChangePassword }: AppShellProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  useEffect(() => {
    if (copyState === 'copied') {
      const timer = window.setTimeout(() => setCopyState('idle'), 2000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [copyState]);

  const maskedKey = useMemo(() => {
    const key = session.api_key;
    if (key.length <= 8) return key;
    return `${key.slice(0, 4)}…${key.slice(-4)}`;
  }, [session.api_key]);

  const effectiveApiKey = mustResetPassword ? '' : session.api_key;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(session.api_key);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = session.api_key;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyState('copied');
    } catch (error) {
      console.error(error);
      setCopyState('error');
    }
  };

  const displayName = session.account.display_name || session.account.email;

  return (
    <div className="min-h-screen bg-surface-base text-slate-100">
      <header className="border-b border-surface-outline/50 bg-surface-raised/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-accent-primary">Operator Control Plane</p>
            <h1 className="text-3xl font-semibold text-white">Third Eye Admin Console</h1>
            <p className="mt-2 text-sm text-slate-300">Manage credentials, budgets, and observability for Overseer deployments.</p>
            {mustResetPassword && (
              <p className="mt-4 rounded-xl border border-accent-danger/40 bg-accent-danger/10 px-4 py-2 text-xs text-accent-danger">
                Password reset required. Update your credentials to re-enable dashboard actions.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Signed in as</p>
              <p className="text-sm font-semibold text-white">{displayName}</p>
              <p className="text-xs text-slate-400">{session.account.email}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
              <div className="flex items-center gap-2 rounded-full border border-surface-outline/60 bg-surface-base/80 px-3 py-1 font-mono text-[11px] text-slate-200">
                <span className="uppercase tracking-[0.3em] text-slate-400">Key</span>
                <span>{maskedKey}</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="rounded-full border border-surface-outline/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-accent-primary transition hover:border-accent-primary"
                >
                  {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Retry' : 'Copy'}
                </button>
              </div>
              <button
                type="button"
                onClick={onChangePassword}
                className="rounded-full border border-surface-outline/60 px-4 py-2 text-slate-200 transition hover:border-accent-primary hover:text-accent-primary"
              >
                Change password
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-full bg-accent-danger px-4 py-2 font-semibold text-surface-base transition hover:bg-rose-500"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
        <nav className="border-t border-surface-outline/40 bg-surface-raised/90">
          <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3 text-xs uppercase tracking-[0.2em] text-slate-300">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `transition hover:text-accent-primary ${isActive ? 'text-accent-primary' : ''}`
              }
            >
              API Keys
            </NavLink>
            <NavLink
              to="/tenants"
              className={({ isActive }) =>
                `transition hover:text-accent-primary ${isActive ? 'text-accent-primary' : ''}`
              }
            >
              Tenants
            </NavLink>
            <NavLink
              to="/metrics"
              className={({ isActive }) =>
                `transition hover:text-accent-primary ${isActive ? 'text-accent-primary' : ''}`
              }
            >
              Metrics
            </NavLink>
            <NavLink
              to="/models"
              className={({ isActive }) =>
                `transition hover:text-accent-primary ${isActive ? 'text-accent-primary' : ''}`
              }
            >
              Models
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `transition hover:text-accent-primary ${isActive ? 'text-accent-primary' : ''}`
              }
            >
              Settings
            </NavLink>
            <NavLink
              to="/personas"
              className={({ isActive }) =>
                `transition hover:text-accent-primary ${isActive ? 'text-accent-primary' : ''}`
              }
            >
              Personas
            </NavLink>
            <NavLink
              to="/audit"
              className={({ isActive }) =>
                `transition hover:text-accent-primary ${isActive ? 'text-accent-primary' : ''}`
              }
            >
              Audit Trail
            </NavLink>
            <span className="ml-auto rounded-full border border-surface-outline/60 px-3 py-1 text-[10px] font-semibold tracking-[0.3em] text-slate-300">
              {mustResetPassword ? 'Reset Required' : 'Connected'}
            </span>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Routes>
          <Route path="/" element={<ApiKeysPage apiKey={effectiveApiKey} disabled={mustResetPassword} />} />
          <Route path="/tenants" element={<TenantsPage apiKey={effectiveApiKey} disabled={mustResetPassword} />} />
          <Route path="/metrics" element={<MetricsPage apiKey={effectiveApiKey} />} />
          <Route path="/models" element={<ModelsPage apiKey={effectiveApiKey} disabled={mustResetPassword} />} />
          <Route path="/settings" element={<SettingsPage apiKey={effectiveApiKey} disabled={mustResetPassword} />} />
          <Route path="/personas" element={<PersonasPage apiKey={effectiveApiKey} disabled={mustResetPassword} />} />
          <Route path="/audit" element={<AuditPage apiKey={effectiveApiKey} />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const session = useAuthStore((state) => state.session);
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);
  const bootstrapStatus = useAuthStore((state) => state.bootstrapStatus);
  const loadingBootstrap = useAuthStore((state) => state.loadingBootstrap);
  const initialize = useAuthStore((state) => state.initialize);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const loadBootstrap = useAuthStore((state) => state.loadBootstrap);
  const mustResetPassword = useAuthStore((state) => state.mustResetPassword);
  const changePassword = useAuthStore((state) => state.changePassword);
  const changingPassword = useAuthStore((state) => state.changingPassword);
  const clearError = useAuthStore((state) => state.clearError);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    initialize().catch((err) => console.error('Failed to initialize auth store', err));
  }, [initialize]);

  useEffect(() => {
    if (mustResetPassword) {
      setPasswordModalOpen(true);
    }
  }, [mustResetPassword]);

  const handleLogin = async ({ email, password }: { email: string; password: string }) => {
    await login(email, password);
  };

  const handlePasswordChange = async ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) => {
    try {
      await changePassword({ oldPassword, newPassword });
      if (!mustResetPassword) {
        setPasswordModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClosePasswordDialog = () => {
    if (mustResetPassword) return;
    setPasswordModalOpen(false);
    clearError();
  };

  const isLoading = status === 'loading';

  return (
    <BrowserRouter>
      {session ? (
        <AppShell
          session={session}
          mustResetPassword={mustResetPassword}
          onLogout={() => {
            logout();
            setPasswordModalOpen(false);
          }}
          onChangePassword={() => setPasswordModalOpen(true)}
        />
      ) : (
        <LoginScreen
          loading={isLoading}
          error={error}
          bootstrapStatus={bootstrapStatus}
          loadingBootstrap={loadingBootstrap}
          onRefreshBootstrap={loadBootstrap}
          onSubmit={handleLogin}
        />
      )}
      <PasswordResetDialog
        open={passwordModalOpen && Boolean(session)}
        enforced={mustResetPassword}
        loading={changingPassword}
        error={error}
        onSubmit={handlePasswordChange}
        onClose={handleClosePasswordDialog}
      />
    </BrowserRouter>
  );
}

export default App;
