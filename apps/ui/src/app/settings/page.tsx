'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useUI } from '@/contexts/UIContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { useDialog } from '@/hooks/useDialog';

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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

  useEffect(() => {
    loadProviderKeys();
    loadHealth();
    loadDbPath();
    loadTelemetrySetting();
  }, []);

  const loadProviderKeys = async () => {
    try {
      const response = await fetch(`${API_URL}/api/provider-keys`);
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
      const response = await fetch(`${API_URL}/health`);
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
      const response = await fetch(`${API_URL}/api/database/info`);
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
      const response = await fetch(`${API_URL}/api/app-settings/telemetry`);
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
      setError('Label and API key are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/provider-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: newKey.provider,
          label: newKey.label,
          apiKey: newKey.apiKey,
        }),
      });

      if (response.ok) {
        setSuccess('Provider key added successfully');
        setNewKey({ provider: 'groq', label: '', apiKey: '' });
        setShowAddKey(false);
        await loadProviderKeys();
        await loadHealth();
      } else {
        const result = await response.json();
        setError(result.error?.detail || 'Failed to add provider key');
      }
    } catch (err) {
      setError('Failed to add provider key');
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

      const response = await fetch(`${API_URL}/api/provider-keys/${editingKey.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setSuccess('Provider key updated successfully');
        setEditingKey(null);
        setEditForm({ label: '', apiKey: '' });
        await loadProviderKeys();
        await loadHealth();
      } else {
        const result = await response.json();
        setError(result.error?.detail || 'Failed to update provider key');
      }
    } catch (err) {
      setError('Failed to update provider key');
    } finally {
      setLoading(false);
    }
  };

  const testProviderKey = async (id: number, provider: string) => {
    setTestingKeyId(id);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/models/${provider}/refresh`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        const modelCount = result.data?.count || 0;
        setSuccess(`✓ ${provider} key works! Found ${modelCount} models`);
        await loadHealth();
      } else {
        setError(`✗ ${provider} key test failed - check your API key`);
      }
    } catch (err) {
      setError(`✗ Failed to test ${provider} key`);
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
      const response = await fetch(`${API_URL}/api/provider-keys/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Provider key deleted');
        await loadProviderKeys();
        await loadHealth();
      } else {
        setError('Failed to delete provider key');
      }
    } catch (err) {
      setError('Failed to delete provider key');
    } finally {
      setLoading(false);
    }
  };

  const toggleTelemetry = async (enabled: boolean) => {
    setTelemetry(enabled);

    try {
      const response = await fetch(`${API_URL}/api/app-settings/telemetry`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: enabled }),
      });

      if (response.ok) {
        setSuccess(`Telemetry ${enabled ? 'enabled' : 'disabled'}`);
      } else {
        setError('Failed to update telemetry setting');
        setTelemetry(!enabled);
      }
    } catch (err) {
      setError('Failed to update telemetry setting');
      setTelemetry(!enabled);
    }
  };

  const downloadBackup = async () => {
    try {
      const response = await fetch(`${API_URL}/api/database/ops/backup`, {
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
        setSuccess('Database backup downloaded');
      } else {
        setError('Failed to create backup');
      }
    } catch (err) {
      setError('Failed to create backup');
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

      const response = await fetch(`${API_URL}/api/database/ops/restore`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setSuccess('Database restored successfully. Reloading...');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError('Failed to restore database');
      }
    } catch (err) {
      setError('Failed to restore database');
    } finally {
      setLoading(false);
    }
  };

  const resetDatabase = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/database/ops/reset`, {
        method: 'POST',
      });

      if (response.ok) {
        setSuccess('Database reset successfully. Reloading...');
        setShowResetConfirm(false);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError('Failed to reset database');
      }
    } catch (err) {
      setError('Failed to reset database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  return (
    <div className="min-h-screen bg-brand-ink">
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-slate-400 transition-colors hover:text-brand-accent">
                ← Home
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Settings</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Application Settings</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-xl border border-green-500/50 bg-green-500/10 p-4 text-green-400">
            {success}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="space-y-8">
          <GlassCard>
            <h2 className="mb-6 text-xl font-semibold text-white">Appearance</h2>

            <div className="space-y-6">
              <div>
                <label className="mb-3 block text-sm font-medium text-slate-300">Theme</label>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {(['overseer', 'midnight', 'ocean', 'forest', 'sunset', 'monochrome'] as const).map((themeName) => (
                    <button
                      key={themeName}
                      onClick={() => setTheme(themeName)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        theme === themeName
                          ? 'border-brand-accent bg-brand-accent/10'
                          : 'border-brand-outline/40 hover:border-brand-accent/60'
                      }`}
                    >
                      <div className="font-semibold capitalize text-white">{themeName}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {themeName === 'overseer' && 'Default theme'}
                        {themeName === 'midnight' && 'Indigo & Purple'}
                        {themeName === 'ocean' && 'Cyan & Teal'}
                        {themeName === 'forest' && 'Emerald & Lime'}
                        {themeName === 'sunset' && 'Orange & Amber'}
                        {themeName === 'monochrome' && 'Grayscale'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-brand-outline/40 p-4">
                <div>
                  <div className="font-medium text-white">Dark Mode</div>
                  <div className="text-sm text-slate-400">Use dark color scheme</div>
                </div>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    darkMode ? 'bg-brand-accent' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="mb-6 text-xl font-semibold text-white">Behavior</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-brand-outline/40 p-4">
                <div>
                  <div className="font-medium text-white">Auto-open Sessions</div>
                  <div className="text-sm text-slate-400">Automatically open new sessions in browser</div>
                </div>
                <button
                  onClick={() => setAutoOpenSessions(!autoOpenSessions)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    autoOpenSessions ? 'bg-brand-accent' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                      autoOpenSessions ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-brand-outline/40 p-4">
                <div>
                  <div className="font-medium text-white">Telemetry</div>
                  <div className="text-sm text-slate-400">Send anonymous usage data to improve the app</div>
                </div>
                <button
                  onClick={() => toggleTelemetry(!telemetry)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    telemetry ? 'bg-brand-accent' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                      telemetry ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Provider Keys</h2>
              <button
                onClick={() => setShowAddKey(!showAddKey)}
                className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary"
              >
                + Add Key
              </button>
            </div>

            {showAddKey && (
              <div className="mb-6 rounded-xl border border-brand-accent/40 bg-brand-accent/5 p-6">
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Provider</label>
                    <select
                      value={newKey.provider}
                      onChange={(e) => setNewKey({ ...newKey, provider: e.target.value })}
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white focus:border-brand-accent focus:outline-none"
                    >
                      <option value="groq">Groq</option>
                      <option value="openrouter">OpenRouter</option>
                      <option value="ollama">Ollama</option>
                      <option value="lmstudio">LM Studio</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Label</label>
                    <input
                      type="text"
                      value={newKey.label}
                      onChange={(e) => setNewKey({ ...newKey, label: e.target.value })}
                      placeholder="My API Key"
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">API Key</label>
                    <input
                      type="password"
                      value={newKey.apiKey}
                      onChange={(e) => setNewKey({ ...newKey, apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 font-mono text-sm text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowAddKey(false)}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addProviderKey}
                      disabled={loading || !newKey.label || !newKey.apiKey}
                      className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary disabled:opacity-50"
                    >
                      {loading ? 'Adding...' : 'Add Key'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {editingKey && (
              <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-500/5 p-6">
                <h3 className="mb-4 font-semibold text-white">Edit {editingKey.provider} Key</h3>
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">Label</label>
                    <input
                      type="text"
                      value={editForm.label}
                      onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                      placeholder="My API Key"
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      New API Key (leave empty to keep current)
                    </label>
                    <input
                      type="password"
                      value={editForm.apiKey}
                      onChange={(e) => setEditForm({ ...editForm, apiKey: e.target.value })}
                      placeholder="sk-... (optional)"
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 font-mono text-sm text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={cancelEdit}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateProviderKey}
                      disabled={loading || !editForm.label}
                      className="rounded-full bg-yellow-500 px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-yellow-600 disabled:opacity-50"
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
                  <p className="text-slate-400">No provider keys configured</p>
                  <p className="mt-2 text-sm text-slate-500">Add API keys to enable LLM providers</p>
                </div>
              ) : (
                providerKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold capitalize text-white">{key.provider}</span>
                        <span className="text-sm text-slate-400">•</span>
                        <span className="text-sm text-slate-400">{key.label}</span>
                        {health?.checks?.providers[key.provider] && (
                          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                            Connected
                          </span>
                        )}
                        {health?.checks?.providers[key.provider] === false && (
                          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                            Offline
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Added {new Date(key.createdAt).toLocaleDateString()} • Encrypted 🔒
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => testProviderKey(key.id, key.provider)}
                        disabled={testingKeyId === key.id}
                        className="rounded-full border border-blue-500/50 px-3 py-1.5 text-sm text-blue-400 transition hover:bg-blue-500/10 disabled:opacity-50"
                      >
                        {testingKeyId === key.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => startEditKey(key)}
                        className="rounded-full border border-yellow-500/50 px-3 py-1.5 text-sm text-yellow-400 transition hover:bg-yellow-500/10"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteProviderKey(key.id)}
                        className="rounded-full border border-red-500/50 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-500/10"
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
            <h2 className="mb-6 text-xl font-semibold text-white">Database</h2>

            <div className="space-y-6">
              <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-4">
                <div className="text-sm text-slate-400">Database Path</div>
                <div className="mt-1 font-mono text-sm text-white">{dbPath}</div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <button
                  onClick={downloadBackup}
                  className="rounded-xl border border-brand-accent/50 bg-brand-accent/5 px-5 py-3 text-center font-semibold text-brand-accent transition hover:bg-brand-accent/10"
                >
                  Backup Database
                </button>

                <label className="cursor-pointer rounded-xl border border-brand-outline/40 px-5 py-3 text-center font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent">
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

                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="rounded-xl border border-red-500/50 px-5 py-3 font-semibold text-red-400 transition hover:bg-red-500/10"
                >
                  Reset Database
                </button>
              </div>

              {showResetConfirm && (
                <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-6">
                  <h3 className="font-semibold text-red-400">⚠️ Confirm Database Reset</h3>
                  <p className="mt-2 text-sm text-red-300">
                    This will delete ALL data including provider keys, sessions, runs, and settings. This action cannot be undone.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={resetDatabase}
                      disabled={loading}
                      className="rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                    >
                      {loading ? 'Resetting...' : 'Yes, Reset Everything'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
