'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { useUI } from '@/contexts/UIContext';

const PROVIDERS = [
  { id: 'groq', name: 'Groq', requiresKey: true },
  { id: 'openrouter', name: 'OpenRouter', requiresKey: true },
  { id: 'ollama', name: 'Ollama', requiresKey: false, hasEndpoint: true, defaultEndpoint: 'http://127.0.0.1:11434' },
  { id: 'lmstudio', name: 'LM Studio', requiresKey: false, hasEndpoint: true, defaultEndpoint: 'http://127.0.0.1:1234' },
];

const THEME_OPTIONS = [
  { id: 'overseer', name: 'Overseer', description: 'Gold/Red Naruto-inspired palette' },
  { id: 'midnight', name: 'Midnight Blue', description: 'Deep blues and purples' },
  { id: 'ocean', name: 'Ocean Breeze', description: 'Cyan and teal tones' },
  { id: 'forest', name: 'Forest Green', description: 'Natural greens and earth tones' },
  { id: 'sunset', name: 'Sunset Orange', description: 'Warm oranges and reds' },
  { id: 'monochrome', name: 'Monochrome', description: 'Grayscale elegance' },
];

export default function SettingsPage() {
  const { darkMode, setDarkMode, theme, setTheme } = useUI();

  // Provider API Keys
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});

  // Provider Endpoints
  const [endpoints, setEndpoints] = useState<Record<string, string>>({
    ollama: 'http://127.0.0.1:11434',
    lmstudio: 'http://127.0.0.1:1234',
  });

  // Server settings
  const [serverHost, setServerHost] = useState('127.0.0.1');
  const [serverPort, setServerPort] = useState(7070);
  const [uiPort, setUiPort] = useState(3300);
  const [autoOpen, setAutoOpen] = useState(true);
  const [telemetry, setTelemetry] = useState(false);

  // Status messages
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const saveApiKey = async (providerId: string) => {
    const key = apiKeys[providerId];
    if (!key || !key.trim()) return;

    setSaveStatus(prev => ({ ...prev, [providerId]: 'saving' }));

    try {
      const response = await fetch('/api/provider-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          label: `${providerId} API Key`,
          apiKey: key.trim(),
        }),
      });

      if (response.ok) {
        setSavedKeys(prev => new Set([...prev, providerId]));
        setSaveStatus(prev => ({ ...prev, [providerId]: 'saved' }));
        setTimeout(() => setSaveStatus(prev => ({ ...prev, [providerId]: undefined as any })), 2000);
      } else {
        setSaveStatus(prev => ({ ...prev, [providerId]: 'error' }));
      }
    } catch (error) {
      console.error(`Failed to save API key for ${providerId}:`, error);
      setSaveStatus(prev => ({ ...prev, [providerId]: 'error' }));
    }
  };

  const saveEndpoint = async (providerId: string) => {
    try {
      const response = await fetch('/api/provider-endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: providerId,
          endpoint: endpoints[providerId],
        }),
      });

      if (response.ok) {
        alert(`${providerId} endpoint saved successfully`);
      }
    } catch (error) {
      console.error(`Failed to save endpoint for ${providerId}:`, error);
    }
  };

  const handleBackup = async () => {
    setBackupStatus('Creating backup...');
    try {
      const response = await fetch('/api/backup', { method: 'POST' });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `third-eye-backup-${new Date().toISOString()}.db`;
        a.click();
        setBackupStatus('✅ Backup downloaded successfully');
      } else {
        setBackupStatus('❌ Backup failed');
      }
    } catch (error) {
      setBackupStatus('❌ Backup error');
    }
    setTimeout(() => setBackupStatus(null), 3000);
  };

  const handleRestore = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.db';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      setRestoreStatus('Restoring database...');
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/restore', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          setRestoreStatus('✅ Database restored successfully');
          setTimeout(() => window.location.reload(), 2000);
        } else {
          setRestoreStatus('❌ Restore failed');
        }
      } catch (error) {
        setRestoreStatus('❌ Restore error');
      }
      setTimeout(() => setRestoreStatus(null), 3000);
    };
    input.click();
  };

  const handleReset = async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }

    setResetStatus('Resetting all data...');
    try {
      const response = await fetch('/api/reset', { method: 'POST' });
      if (response.ok) {
        setResetStatus('✅ All data reset');
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setResetStatus('❌ Reset failed');
      }
    } catch (error) {
      setResetStatus('❌ Reset error');
    }
    setShowResetConfirm(false);
    setTimeout(() => setResetStatus(null), 3000);
  };

  return (
    <div className="min-h-screen bg-brand-ink">
      {/* Header */}
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

      <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* Theme Settings */}
        <GlassCard>
          <h2 className="mb-4 text-xl font-semibold text-white">Theme & Appearance</h2>
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Select Theme</label>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {THEME_OPTIONS.map((themeOption) => (
                  <button
                    key={themeOption.id}
                    onClick={() => setTheme(themeOption.id as any)}
                    className={`rounded-xl border p-4 text-left transition ${
                      theme === themeOption.id
                        ? 'border-brand-accent bg-brand-accent/10 ring-2 ring-brand-accent'
                        : 'border-brand-outline/50 bg-brand-paper/60 hover:border-brand-accent/40'
                    }`}
                  >
                    <div className="font-semibold text-white">{themeOption.name}</div>
                    <div className="mt-1 text-xs text-slate-400">{themeOption.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="darkMode"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                className="h-4 w-4 rounded border-brand-outline/50 bg-brand-paper accent-brand-accent"
              />
              <label htmlFor="darkMode" className="text-slate-300">
                Enable Dark Mode
              </label>
            </div>
            <p className="text-sm text-slate-400">
              Dark mode applies darker backgrounds and lighter text for better visibility in low-light environments.
            </p>
          </div>
        </GlassCard>

        {/* Provider API Keys */}
        <GlassCard>
          <h2 className="mb-4 text-xl font-semibold text-white">Provider API Keys</h2>
          <p className="mb-4 text-sm text-slate-400">
            Configure your API keys for cloud-based LLM providers. Keys are encrypted and stored securely.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {PROVIDERS.filter(p => p.requiresKey).map(provider => (
              <div key={provider.id} className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  {provider.name} API Key {savedKeys.has(provider.id) && <span className="text-emerald-400">🔒 Saved</span>}
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter API key..."
                    value={apiKeys[provider.id] || ''}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                    className="flex-1 rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  />
                  <button
                    onClick={() => saveApiKey(provider.id)}
                    disabled={!apiKeys[provider.id]?.trim() || saveStatus[provider.id] === 'saving'}
                    className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary disabled:opacity-50"
                  >
                    {saveStatus[provider.id] === 'saving' ? 'Saving...' :
                     saveStatus[provider.id] === 'saved' ? '✓ Saved' :
                     saveStatus[provider.id] === 'error' ? '✗ Error' : 'Save'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Provider Endpoints */}
        <GlassCard>
          <h2 className="mb-4 text-xl font-semibold text-white">Provider Endpoints</h2>
          <p className="mb-4 text-sm text-slate-400">
            Configure local provider endpoints for Ollama and LM Studio.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {PROVIDERS.filter(p => p.hasEndpoint).map(provider => (
              <div key={provider.id} className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  {provider.name} Endpoint URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={provider.defaultEndpoint}
                    value={endpoints[provider.id] || provider.defaultEndpoint}
                    onChange={(e) => setEndpoints(prev => ({ ...prev, [provider.id]: e.target.value }))}
                    className="flex-1 rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 font-mono text-sm text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                  />
                  <button
                    onClick={() => saveEndpoint(provider.id)}
                    className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary"
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Server Settings */}
        <GlassCard>
          <h2 className="mb-4 text-xl font-semibold text-white">MCP Server Configuration</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Bind Address</label>
              <input
                type="text"
                value={serverHost}
                onChange={(e) => setServerHost(e.target.value)}
                className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
              />
              <p className="mt-1 text-sm text-slate-400">
                ⚠️ Use 127.0.0.1 for local-only access (recommended)
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Server Port</label>
              <input
                type="number"
                value={serverPort}
                onChange={(e) => setServerPort(parseInt(e.target.value))}
                className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
              />
            </div>
          </div>
        </GlassCard>

        {/* UI Settings */}
        <GlassCard>
          <h2 className="mb-4 text-xl font-semibold text-white">UI Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">UI Port</label>
              <input
                type="number"
                value={uiPort}
                onChange={(e) => setUiPort(parseInt(e.target.value))}
                className="w-full max-w-xs rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoOpen"
                checked={autoOpen}
                onChange={(e) => setAutoOpen(e.target.checked)}
                className="h-4 w-4 rounded border-brand-outline/50 bg-brand-paper accent-brand-accent"
              />
              <label htmlFor="autoOpen" className="text-slate-300">
                Auto-open latest session on startup
              </label>
            </div>
          </div>
        </GlassCard>

        {/* Privacy Settings */}
        <GlassCard>
          <h2 className="mb-4 text-xl font-semibold text-white">Privacy & Telemetry</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="telemetry"
                checked={telemetry}
                onChange={(e) => setTelemetry(e.target.checked)}
                className="h-4 w-4 rounded border-brand-outline/50 bg-brand-paper accent-brand-accent"
              />
              <label htmlFor="telemetry" className="text-slate-300">
                Enable anonymous telemetry (opt-in)
              </label>
            </div>
            <p className="text-sm text-slate-400">
              When enabled, sends minimal anonymous metrics to help improve Third Eye MCP.
              Default: OFF. All data remains local-first.
            </p>
          </div>
        </GlassCard>

        {/* Data Management */}
        <GlassCard>
          <h2 className="mb-4 text-xl font-semibold text-white">Data Management</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Database Location</label>
              <code className="block w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 font-mono text-sm text-green-400">
                ~/.overseer/overseer.db
              </code>
              <p className="mt-1 text-sm text-slate-400">
                All personas, sessions, and configuration stored locally. Override with OVERSEER_DB environment variable.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                onClick={handleBackup}
                className="rounded-full border border-brand-accent bg-brand-accent/10 px-4 py-2 text-sm font-semibold text-brand-accent transition hover:bg-brand-accent/20"
              >
                💾 Backup Database
              </button>
              <button
                onClick={handleRestore}
                className="rounded-full border border-blue-500 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-400 transition hover:bg-blue-500/20"
              >
                📥 Restore Database
              </button>
              <button
                onClick={handleReset}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  showResetConfirm
                    ? 'border-red-500 bg-red-500/20 text-red-400 hover:bg-red-500/30'
                    : 'border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                }`}
              >
                {showResetConfirm ? '⚠️ Click Again to Confirm Reset' : '🗑️ Reset All Data'}
              </button>
            </div>

            {backupStatus && <p className="text-sm text-slate-300">{backupStatus}</p>}
            {restoreStatus && <p className="text-sm text-slate-300">{restoreStatus}</p>}
            {resetStatus && <p className="text-sm text-slate-300">{resetStatus}</p>}
          </div>
        </GlassCard>

        {/* Security */}
        <GlassCard>
          <h2 className="mb-4 text-xl font-semibold text-white">Security</h2>
          <div className="rounded-xl border border-yellow-700/50 bg-yellow-900/10 p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-yellow-400">⚠️</span>
              <span className="font-medium text-yellow-300">Security Notice</span>
            </div>
            <ul className="space-y-1 text-sm text-yellow-100">
              <li>• Provider API keys are encrypted at rest using OS keychain when available</li>
              <li>• Fallback to AES-256-GCM with user passphrase</li>
              <li>• Server binds to 127.0.0.1 by default for local-only access</li>
              <li>• Markdown content is sanitized (DOMPurify) before rendering</li>
              <li>• No external dependencies except user-owned provider APIs</li>
            </ul>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
