import { create } from 'zustand';
import {
  adminLogin,
  adminChangePassword,
  fetchAdminAccount,
  fetchBootstrapStatus,
} from '../lib/api';
import type { AdminAuthSession, AdminBootstrapStatus } from '../types/admin';

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'error';

interface AuthStoreState {
  session: AdminAuthSession | null;
  status: AuthStatus;
  error: string | null;
  mustResetPassword: boolean;
  checkingSession: boolean;
  loadingBootstrap: boolean;
  bootstrapStatus: AdminBootstrapStatus | null;
  changingPassword: boolean;
}

interface AuthStoreActions {
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (payload: { oldPassword: string; newPassword: string }) => Promise<void>;
  refreshAccount: () => Promise<void>;
  loadBootstrap: () => Promise<void>;
  clearError: () => void;
}

type AuthStore = AuthStoreState & AuthStoreActions;

const SESSION_STORAGE_KEY = 'third-eye.admin-session';

function readStoredSession(): AdminAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminAuthSession;
    if (!parsed?.api_key || !parsed?.account) return null;
    return parsed;
  } catch (error) {
    console.warn('Failed to parse stored admin session', error);
    return null;
  }
}

function persistSession(session: AdminAuthSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Failed to persist admin session', error);
  }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  status: 'idle',
  error: null,
  mustResetPassword: false,
  checkingSession: false,
  loadingBootstrap: false,
  bootstrapStatus: null,
  changingPassword: false,
  clearError: () => set({ error: null }),
  loadBootstrap: async () => {
    set({ loadingBootstrap: true });
    try {
      const status = await fetchBootstrapStatus();
      set({ bootstrapStatus: status });
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to load bootstrap status' });
    } finally {
      set({ loadingBootstrap: false });
    }
  },
  initialize: async () => {
    if (get().checkingSession) return;
    set({ checkingSession: true, error: null });

    const stored = readStoredSession();
    if (stored) {
      set({ session: stored, status: 'authenticated' });
      try {
        const account = await fetchAdminAccount(stored.api_key);
        const updatedSession: AdminAuthSession = { ...stored, account };
        persistSession(updatedSession);
        set({
          session: updatedSession,
          mustResetPassword: account.require_password_reset,
          status: 'authenticated',
        });
      } catch (error) {
        console.error(error);
        persistSession(null);
        set({
          session: null,
          status: 'idle',
          error: 'Session expired. Log in again.',
          mustResetPassword: false,
        });
      }
    }

    set({ checkingSession: false });
    await get().loadBootstrap();
  },
  login: async (email, password) => {
    set({ status: 'loading', error: null });
    try {
      const response = await adminLogin({ email, password });
      const session: AdminAuthSession = {
        key_id: response.key_id,
        api_key: response.api_key,
        account: response.account,
      };
      persistSession(session);
      set({
        session,
        status: 'authenticated',
        mustResetPassword: response.force_password_reset,
      });
      await get().loadBootstrap();
    } catch (error) {
      console.error(error);
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unable to log in',
      });
    }
  },
  logout: () => {
    persistSession(null);
    set({ session: null, status: 'idle', mustResetPassword: false });
  },
  changePassword: async ({ oldPassword, newPassword }) => {
    const current = get().session;
    if (!current) return;
    set({ changingPassword: true, error: null });
    try {
      const response = await adminChangePassword(current.api_key, {
        oldPassword,
        newPassword,
      });
      const updatedSession: AdminAuthSession = {
        key_id: response.key_id,
        api_key: response.api_key,
        account: response.account,
      };
      persistSession(updatedSession);
      set({
        session: updatedSession,
        mustResetPassword: response.force_password_reset,
        changingPassword: false,
        status: 'authenticated',
      });
    } catch (error) {
      console.error(error);
      set({
        error: error instanceof Error ? error.message : 'Failed to change password',
        changingPassword: false,
      });
      throw error;
    }
  },
  refreshAccount: async () => {
    const current = get().session;
    if (!current) return;
    try {
      const account = await fetchAdminAccount(current.api_key);
      const updatedSession: AdminAuthSession = { ...current, account };
      persistSession(updatedSession);
      set({
        session: updatedSession,
        mustResetPassword: account.require_password_reset,
      });
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Unable to refresh account' });
    }
  },
}));
