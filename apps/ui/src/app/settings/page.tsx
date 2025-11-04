'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useUI } from '@/contexts/UIContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { useDialog } from '@/hooks/useDialog';
import { THEME_METADATA } from '@third-eye/theme';
import { UI_HELP_TEXT } from '@third-eye/constants';
import { API_BASE_URL } from '@/consts/api';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE, STATUS_BORDER_COLORS_SUBTLE, STATUS_BG_COLORS } from '@/constants/color-mappings';
import { TIMING } from '@/constants/timing';
import { TOGGLE_KNOB_CLASS } from '@/constants/design-tokens';

interface ProviderKey {
  id: number;
  provider: string;
  label: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface HealthStatus {
  ok: boolean;
  status: string;
  checks: {
    database: { ok: boolean; latency_ms: number };
    providers: Record<string, boolean>;
  };
  uptime_seconds: number;
  version: string;
}

export default function SettingsPage() {
  const dialog = useDialog();
  const { theme, setTheme, darkMode, setDarkMode, autoOpenSessions, setAutoOpenSessions } = useUI();

  const [providerKeys, setProviderKeys] = useState<ProviderKey[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [dbPath, setDbPath] = useState<string>('');

  const [newKey, setNewKey] = useState({ provider: 'groq', label: '', apiKey: '' });
  const [showAddKey, setShowAddKey] = useState(false);
  const [editingKey, setEditingKey] = useState<ProviderKey | null>(null);
  const [editForm, setEditForm] = useState({ label: '', apiKey: '' });
  const [testingKeyId, setTestingKeyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showFactoryResetConfirm, setShowFactoryResetConfirm] = useState(false);
  const [factoryResetInput, setFactoryResetInput] = useState('');

  useEffect(() => {
    loadProviderKeys();
    loadHealth();
    loadDbPath();
    loadTelemetrySetting();
  }, []);

  const loadProviderKeys = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/provider-keys`);
      if (response.ok) {
        const result = await response.json();
        setProviderKeys(result.data || []);
      }
    } catch (err) {
      console.error('Failed to load provider keys:', err);
    }
  };

  const loadHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (err) {
      console.error('Failed to load health:', err);
    }
  };

  const loadDbPath = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/database/info`);
      if (response.ok) {
        const result = await response.json();
        setDbPath(result.data?.path || '~/.third-eye-mcp/mcp.db');
      } else {
        setDbPath('~/.third-eye-mcp/mcp.db');
      }
    } catch (err) {
      setDbPath('~/.third-eye-mcp/mcp.db');
    }
  };

  const loadTelemetrySetting = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/app-settings/telemetry`);
      if (response.ok) {
        const result = await response.json();
        setTelemetry(result.data?.value === true || result.data?.value === 'true');
      }
    } catch (err) {
      console.error('Failed to load telemetry setting:', err);
    }
  };

  const addProviderKey = async () => {
    if (!newKey.label || !newKey.apiKey) {
      setError(UI_HELP_TEXT.ERROR_SETTINGS_KEY_LABEL_REQUIRED);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/provider-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: newKey.provider,
          label: newKey.label,
          apiKey: newKey.apiKey,
        }),
      });

      if (response.ok) {
        setSuccess(UI_HELP_TEXT.SUCCESS_SETTINGS_KEY_ADDED);
        setNewKey({ provider: 'groq', label: '', apiKey: '' });
        setShowAddKey(false);
        await loadProviderKeys();
        await loadHealth();
      } else {
        const result = await response.json();
        setError(result.error?.detail || UI_HELP_TEXT.ERROR_SETTINGS_KEY_ADD_FAILED);
      }
    } catch (err) {
      setError(UI_HELP_TEXT.ERROR_SETTINGS_KEY_ADD_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const startEditKey = (key: ProviderKey) => {
    setEditingKey(key);
    setEditForm({ label: key.label, apiKey: '' });
    setShowAddKey(false);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditForm({ label: '', apiKey: '' });
  };

  const updateProviderKey = async () => {
    if (!editingKey) return;

    setLoading(true);
    setError(null);

    try {
      const body: { label: string; apiKey?: string } = { label: editForm.label };
      if (editForm.apiKey.trim()) {
        body.apiKey = editForm.apiKey;
      }

      const response = await fetch(`${API_BASE_URL}/api/provider-keys/${editingKey.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setSuccess(UI_HELP_TEXT.SUCCESS_SETTINGS_KEY_UPDATED);
        setEditingKey(null);
        setEditForm({ label: '', apiKey: '' });
        await loadProviderKeys();
        await loadHealth();
      } else {
        const result = await response.json();
        setError(result.error?.detail || UI_HELP_TEXT.ERROR_SETTINGS_KEY_UPDATE_FAILED);
      }
    } catch (err) {
      setError(UI_HELP_TEXT.ERROR_SETTINGS_KEY_UPDATE_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const testProviderKey = async (id: number, provider: string) => {
    setTestingKeyId(id);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/models/${provider}/refresh`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        const modelCount = result.data?.count || 0;
        setSuccess(`✓ ${provider} ${UI_HELP_TEXT.SUCCESS_SETTINGS_KEY_TEST_OK.replace('{count}', String(modelCount))}`);
        await loadHealth();
      } else {
        setError(`✗ ${provider} ${UI_HELP_TEXT.ERROR_SETTINGS_KEY_TEST_FAILED}`);
      }
    } catch (err) {
      setError(UI_HELP_TEXT.ERROR_SETTINGS_KEY_TEST_ERROR.replace('{provider}', provider));
    } finally {
      setTestingKeyId(null);
    }
  };

  const deleteProviderKey = async (id: number) => {
    const confirmed = await dialog.confirm('Delete Provider Key', 'Are you sure you want to delete this provider key?', 'Delete', 'Cancel');
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/provider-keys/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess(UI_HELP_TEXT.SUCCESS_SETTINGS_KEY_DELETED);
        await loadProviderKeys();
        await loadHealth();
      } else {
        setError(UI_HELP_TEXT.ERROR_SETTINGS_KEY_DELETE_FAILED);
      }
    } catch (err) {
      setError(UI_HELP_TEXT.ERROR_SETTINGS_KEY_DELETE_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const toggleTelemetry = async (enabled: boolean) => {
    setTelemetry(enabled);

    try {
      const response = await fetch(`${API_BASE_URL}/api/app-settings/telemetry`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: enabled }),
      });

      if (response.ok) {
        setSuccess(enabled ? UI_HELP_TEXT.SUCCESS_SETTINGS_TELEMETRY_ENABLED : UI_HELP_TEXT.SUCCESS_SETTINGS_TELEMETRY_DISABLED);
      } else {
        setError(UI_HELP_TEXT.ERROR_SETTINGS_TELEMETRY_FAILED);
        setTelemetry(!enabled);
      }
    } catch (err) {
      setError(UI_HELP_TEXT.ERROR_SETTINGS_TELEMETRY_FAILED);
      setTelemetry(!enabled);
    }
  };

  const downloadBackup = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/database/ops/backup`, {
        method: 'POST',
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `third-eye-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setSuccess(UI_HELP_TEXT.SUCCESS_SETTINGS_DB_BACKUP);
      } else {
        setError(UI_HELP_TEXT.ERROR_SETTINGS_DB_BACKUP_FAILED);
      }
    } catch (err) {
      setError(UI_HELP_TEXT.ERROR_SETTINGS_DB_BACKUP_FAILED);
    }
  };

  const restoreBackup = async (file: File) => {
    const confirmed = await dialog.confirm('Restore Database', 'Restore database from backup? This will replace current data.', 'Restore', 'Cancel');
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/database/ops/restore`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setSuccess(UI_HELP_TEXT.SUCCESS_SETTINGS_DB_RESTORED);
        setTimeout(() => window.location.reload(), TIMING.RELOAD_DELAY_MS);
      } else {
        setError(UI_HELP_TEXT.ERROR_SETTINGS_DB_RESTORE_FAILED);
      }
    } catch (err) {
      setError(UI_HELP_TEXT.ERROR_SETTINGS_DB_RESTORE_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const resetDatabase = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/database/ops/reset`, {
        method: 'POST',
      });

      if (response.ok) {
        setSuccess(UI_HELP_TEXT.SUCCESS_SETTINGS_DB_RESET);
        setShowResetConfirm(false);
        setTimeout(() => window.location.reload(), TIMING.RELOAD_DELAY_MS);
      } else {
        setError(UI_HELP_TEXT.ERROR_SETTINGS_DB_RESET_FAILED);
      }
    } catch (err) {
      setError(UI_HELP_TEXT.ERROR_SETTINGS_DB_RESET_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const factoryReset = async () => {
    if (factoryResetInput !== 'DELETE') {
      setError('Please type DELETE to confirm factory reset');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/system/factory-reset`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(result.message || 'Database deleted. Please restart the app to restore defaults.');
        setShowFactoryResetConfirm(false);
        setFactoryResetInput('');
        setTimeout(() => {
          alert('Please close and restart the application to complete the factory reset.');
        }, 1000);
      } else {
        const result = await response.json();
        setError(result.error || 'Factory reset failed');
      }
    } catch (err) {
      setError('Factory reset failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), TIMING.MESSAGE_AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), TIMING.MESSAGE_AUTO_DISMISS_MS);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <div className="min-h-screen bg-brand-paper">
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-semantic-muted transition-colors hover:text-brand-accent">
                ← Home
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Settings</p>
                <h1 className="mt-1 text-2xl font-semibold text-brand-foreground">Application Settings</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} p-4 ${STATUS_TEXT_COLORS.error}`}>
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.success} ${STATUS_BG_COLORS_SUBTLE.success} p-4 ${STATUS_TEXT_COLORS.success}`}>
            {success}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="space-y-8">
          <GlassCard>
            <h2 className="mb-6 text-xl font-semibold text-brand-foreground">Appearance</h2>

            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-medium text-semantic-muted">Theme</label>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {THEME_METADATA.map((themeOption) => (
                    <button
                      key={themeOption.value}
                      onClick={() => setTheme(themeOption.value)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        theme === themeOption.value
                          ? 'border-brand-accent bg-brand-accent/10'
                          : 'border-brand-outline/40 hover:border-brand-accent/60'
                      }`}
                    >
                      <div className="font-semibold text-brand-foreground">{themeOption.label}</div>
                      <div className="mt-1 text-xs text-semantic-muted">{themeOption.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-brand-outline/40 p-4">
                <div>
                  <div className="font-medium text-brand-foreground">Dark Mode</div>
                  <div className="text-sm text-semantic-muted">Use dark color scheme</div>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    darkMode ? 'bg-brand-accent' : 'bg-brand-outline'
                  }`}
                >
                  <div
                    className={`absolute top-1 h-5 w-5 rounded-full ${TOGGLE_KNOB_CLASS} transition-transform ${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="mb-6 text-xl font-semibold text-brand-foreground">Behavior</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-brand-outline/40 p-4">
                <div>
                  <div className="font-medium text-brand-foreground">Auto-open Sessions</div>
                  <div className="text-sm text-semantic-muted">Automatically open new sessions in browser</div>
                </div>
                <button
                  onClick={() => setAutoOpenSessions(!autoOpenSessions)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    autoOpenSessions ? 'bg-brand-accent' : 'bg-brand-outline'
                  }`}
                >
                  <div
                    className={`absolute top-1 h-5 w-5 rounded-full ${TOGGLE_KNOB_CLASS} transition-transform ${
                      autoOpenSessions ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-brand-outline/40 p-4">
                <div>
                  <div className="font-medium text-brand-foreground">Telemetry</div>
                  <div className="text-sm text-semantic-muted">Send anonymous usage data to improve the app</div>
                </div>
                <button
                  onClick={() => toggleTelemetry(!telemetry)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    telemetry ? 'bg-brand-accent' : 'bg-brand-outline'
                  }`}
                >
                  <div
                    className={`absolute top-1 h-5 w-5 rounded-full ${TOGGLE_KNOB_CLASS} transition-transform ${
                      telemetry ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-brand-foreground">Provider Keys</h2>
              <button
                onClick={() => setShowAddKey(!showAddKey)}
                className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-brand-primary"
              >
                + Add Key
              </button>
            </div>

            {showAddKey && (
              <div className="mb-6 rounded-xl border border-brand-accent/40 bg-brand-accent/5 p-6">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-semantic-muted">Provider</label>
                    <select
                      value={newKey.provider}
                      onChange={(e) => setNewKey({ ...newKey, provider: e.target.value })}
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-brand-foreground focus:border-brand-accent focus:outline-none"
                    >
                      <option value="groq">Groq</option>
                      <option value="openrouter">OpenRouter</option>
                      <option value="ollama">Ollama</option>
                      <option value="lmstudio">LM Studio</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-semantic-muted">Label</label>
                    <input
                      type="text"
                      value={newKey.label}
                      onChange={(e) => setNewKey({ ...newKey, label: e.target.value })}
                      placeholder="My API Key"
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-brand-foreground placeholder-brand-outline focus:border-brand-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-semantic-muted">API Key</label>
                    <input
                      type="password"
                      value={newKey.apiKey}
                      onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 font-mono text-sm text-brand-foreground placeholder-brand-outline focus:border-brand-accent focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowAddKey(false)}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm text-semantic-muted transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addProviderKey}
                      disabled={loading || !newKey.label || !newKey.apiKey}
                      className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-brand-primary disabled:opacity-50"
                    >
                      {loading ? 'Adding...' : 'Add Key'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {editingKey && (
              <div className={`mb-6 rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.warning} ${STATUS_BG_COLORS_SUBTLE.warning} p-6`}>
                <h3 className="mb-4 font-semibold text-brand-foreground">Edit {editingKey.provider} Key</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-semantic-muted">Label</label>
                    <input
                      type="text"
                      value={editForm.label}
                      onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      placeholder="My API Key"
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-brand-foreground placeholder-brand-outline focus:border-brand-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-semantic-muted">
                      New API Key (leave empty to keep current)
                    </label>
                    <input
                      type="password"
                      value={editForm.apiKey}
                      onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })}
                      placeholder="sk-... (optional)"
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 font-mono text-sm text-brand-foreground placeholder-brand-outline focus:border-brand-accent focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={cancelEdit}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm text-semantic-muted transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateProviderKey}
                      disabled={loading || !editForm.label}
                      className={`rounded-full ${STATUS_BG_COLORS.warning} px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90 disabled:opacity-50`}
                    >
                      {loading ? 'Updating...' : 'Update Key'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {providerKeys.length === 0 ? (
                <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-8 text-center">
                  <p className="text-semantic-muted">No provider keys configured</p>
                  <p className="mt-2 text-sm text-semantic-muted">Add API keys to enable LLM providers</p>
                </div>
              ) : (
                providerKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold capitalize text-brand-foreground">{key.provider}</span>
                        <span className="text-sm text-semantic-muted">•</span>
                        <span className="text-sm text-semantic-muted">{key.label}</span>
                        {health?.checks?.providers[key.provider] && (
                          <span className={`rounded-full ${STATUS_BG_COLORS_SUBTLE.success} px-2 py-0.5 text-xs ${STATUS_TEXT_COLORS.success}`}>
                            Connected
                          </span>
                        )}
                        {health?.checks?.providers[key.provider] === false && (
                          <span className={`rounded-full ${STATUS_BG_COLORS_SUBTLE.error} px-2 py-0.5 text-xs ${STATUS_TEXT_COLORS.error}`}>
                            Offline
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-semantic-muted">
                        Added {new Date(key.createdAt).toLocaleDateString()} • Encrypted 🔒
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => testProviderKey(key.id, key.provider)}
                        disabled={testingKeyId === key.id}
                        className={`rounded-full border ${STATUS_BORDER_COLORS_SUBTLE.info} px-3 py-1.5 text-sm ${STATUS_TEXT_COLORS.info} transition hover:${STATUS_BG_COLORS_SUBTLE.info} disabled:opacity-50`}
                      >
                        {testingKeyId === key.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => startEditKey(key)}
                        className={`rounded-full border ${STATUS_BORDER_COLORS_SUBTLE.warning} px-3 py-1.5 text-sm ${STATUS_TEXT_COLORS.warning} transition hover:${STATUS_BG_COLORS_SUBTLE.warning}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteProviderKey(key.id)}
                        className={`rounded-full border ${STATUS_BORDER_COLORS_SUBTLE.error} px-3 py-1.5 text-sm ${STATUS_TEXT_COLORS.error} transition hover:${STATUS_BG_COLORS_SUBTLE.error}`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="mb-6 text-xl font-semibold text-brand-foreground">Database</h2>

            <div className="space-y-6">
              <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-4">
                <div className="text-sm text-semantic-muted">Database Path</div>
                <div className="mt-1 font-mono text-sm text-brand-foreground">{dbPath}</div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <button
                  onClick={downloadBackup}
                  className="rounded-xl border border-brand-accent/50 bg-brand-accent/5 px-5 py-3 text-center font-semibold text-brand-accent transition hover:bg-brand-accent/10"
                >
                  Backup Database
                </button>

                <label className="cursor-pointer rounded-xl border border-brand-outline/40 px-5 py-3 text-center font-semibold text-semantic-muted transition hover:border-brand-accent hover:text-brand-accent">
                  Restore Database
                  <input
                    type="file"
                    accept=".db"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) restoreBackup(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <section className="rounded-xl border-2 border-red-500/50 bg-red-500/10 p-6">
              <h3 className="text-xl font-semibold text-red-400 mb-3">⚠️ Factory Reset</h3>
              <p className="text-slate-300 mb-4">
                Delete the database file completely and restore all default personas, eyes, and pipelines.
                This will permanently delete ALL custom eyes, personas, pipelines, and integrations.
              </p>
              
              {!showFactoryResetConfirm ? (
                <button
                  onClick={() => setShowFactoryResetConfirm(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-semibold transition"
                >
                  Delete Database & Reset to Defaults
                </button>
              ) : (
                <div className="mt-4 space-y-4 rounded-xl border border-red-500/60 bg-red-500/20 p-6">
                  <div>
                    <h4 className="font-semibold text-red-300 mb-2">⚠️ Confirm Factory Reset</h4>
                    <p className="text-sm text-red-200 mb-4">
                      This will permanently delete ALL custom eyes, personas, pipelines, and integrations.
                      Built-in defaults will be restored on next app start. This action cannot be undone.
                    </p>
                    <p className="text-sm text-red-200 mb-3 font-semibold">
                      Type <span className="font-mono bg-red-900/50 px-2 py-1 rounded">DELETE</span> to confirm:
                    </p>
                    <input
                      type="text"
                      value={factoryResetInput}
                      onChange={(e) => setFactoryResetInput(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full rounded-xl border border-red-500/50 bg-red-950/50 px-4 py-3 text-red-100 placeholder-red-400/50 focus:border-red-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowFactoryResetConfirm(false);
                        setFactoryResetInput('');
                      }}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm text-semantic-muted transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={factoryReset}
                      disabled={loading || factoryResetInput !== 'DELETE'}
                      className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Resetting...' : 'Yes, Factory Reset Everything'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
