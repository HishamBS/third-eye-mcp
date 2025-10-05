import { useEffect, useRef, useState } from 'react';
import ApiKeyCreateForm from '../components/ApiKeyCreateForm';
import ApiKeyTable from '../components/ApiKeyTable';
import ApiKeyEditDrawer from '../components/ApiKeyEditDrawer';
import SecretBanner from '../components/SecretBanner';
import { useAdminStore } from '../store/adminStore';
import type { ApiKeyEntry, ApiKeyCreatePayload, ApiKeyUpdatePayload } from '../types/admin';

export interface ApiKeysPageProps {
  apiKey: string;
  disabled?: boolean;
}

export function ApiKeysPage({ apiKey, disabled = false }: ApiKeysPageProps) {
  const [selectedKey, setSelectedKey] = useState<ApiKeyEntry | null>(null);
  const [confirming, setConfirming] = useState<ApiKeyEntry | null>(null);
  const [reason, setReason] = useState('');
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [highlightedKeyId, setHighlightedKeyId] = useState<string | null>(null);
  const flashTimerRef = useRef<number | null>(null);

  const {
    apiKeys,
    loadingKeys,
    lastSecret,
    fetchApiKeys,
    createApiKey,
    rotateApiKey,
    revokeApiKey,
    restoreApiKey,
    updateApiKey,
    clearSecret,
    error,
  } = useAdminStore();

  useEffect(() => {
    if (apiKey) {
      fetchApiKeys(apiKey, { includeRevoked }).catch(() => {});
    }
  }, [apiKey, includeRevoked, fetchApiKeys]);

  useEffect(() => () => {
    if (flashTimerRef.current) {
      window.clearTimeout(flashTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!highlightedKeyId) return;
    const timer = window.setTimeout(() => setHighlightedKeyId(null), 6000);
    return () => window.clearTimeout(timer);
  }, [highlightedKeyId]);

  useEffect(() => {
    if (!highlightedKeyId) return;
    const timeout = window.setTimeout(() => {
      const element = document.getElementById(`key-row-${highlightedKeyId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
    return () => window.clearTimeout(timeout);
  }, [highlightedKeyId, apiKeys]);

  const showFlash = (message: string, keyId?: string | null) => {
    setFlash(message);
    if (flashTimerRef.current) {
      window.clearTimeout(flashTimerRef.current);
    }
    flashTimerRef.current = window.setTimeout(() => setFlash(null), 5000);
    if (keyId) {
      setHighlightedKeyId(keyId);
    }
  };

  const handleCreate = async (payload: ApiKeyCreatePayload) => {
    if (!apiKey || disabled) return;
    try {
      const secret = await createApiKey(apiKey, payload);
      if (secret?.id) {
        showFlash('API key created successfully. Save the secret now.', secret.id);
      } else {
        showFlash('API key created successfully. Save the secret now.');
      }
    } catch (error) {
      throw error;
    }
  };

  const handleRotate = async (keyId: string) => {
    if (!apiKey || disabled) return;
    await rotateApiKey(apiKey, keyId);
    showFlash('API key rotated. New secret issued above.', keyId);
  };

  const handleRevoke = (entry: ApiKeyEntry) => {
    setConfirming(entry);
    setReason('');
  };

  const submitRevoke = async () => {
    if (!apiKey || !confirming) return;
    await revokeApiKey(apiKey, confirming.id, reason);
    showFlash('API key revoked.', confirming.id);
    setConfirming(null);
  };

  const submitRestore = async (keyId: string) => {
    if (!apiKey || disabled) return;
    await restoreApiKey(apiKey, keyId);
    showFlash('API key restored.', keyId);
  };

  return (
    <div className="space-y-6">
      {lastSecret && <SecretBanner secret={lastSecret} onDismiss={clearSecret} />}
      {flash && (
        <div className="rounded-xl border border-accent-success/40 bg-accent-success/10 px-4 py-3 text-sm text-accent-success">
          {flash}
        </div>
      )}
      {error && <p className="rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-3 text-sm text-accent-danger">{error}</p>}

      <ApiKeyCreateForm onSubmit={handleCreate} disabled={disabled || !apiKey} apiKey={apiKey} />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Issued Keys</h2>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={includeRevoked}
            onChange={(event) => setIncludeRevoked(event.target.checked)}
            className="h-4 w-4 rounded border border-surface-outline/60 bg-surface-base accent-accent-primary"
          />
          Show revoked
        </label>
      </div>

      <ApiKeyTable
        apiKeys={apiKeys}
        loading={loadingKeys}
        highlightKeyId={highlightedKeyId}
        onRotate={handleRotate}
        onRevoke={(keyId) => {
          const entry = apiKeys.find((key) => key.id === keyId);
          if (entry) handleRevoke(entry);
        }}
        onRestore={submitRestore}
        onEdit={(entry) => setSelectedKey(entry)}
      />

      <ApiKeyEditDrawer
        keyEntry={selectedKey}
        open={Boolean(selectedKey)}
        onClose={() => setSelectedKey(null)}
        loading={disabled || !apiKey}
        apiKey={apiKey}
        onSave={async (payload: ApiKeyUpdatePayload) => {
          if (!apiKey || !selectedKey) return;
          await updateApiKey(apiKey, selectedKey.id, payload);
        }}
      />

      {confirming && (
        <div className="rounded-2xl border border-accent-danger/40 bg-accent-danger/10 p-4 text-sm text-accent-danger">
          <p className="text-sm">
            Revoke <span className="font-mono text-xs">{confirming.id}</span>? Enter optional reason for audit trail.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <textarea
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="rounded-lg border border-accent-danger/60 bg-surface-base px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent-danger/60"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="rounded-full border border-surface-outline/60 px-4 py-2 text-slate-200 transition hover:border-accent-primary hover:text-accent-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRevoke}
                className="rounded-full bg-accent-danger px-4 py-2 font-semibold text-surface-base transition hover:bg-rose-500"
              >
                Confirm revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiKeysPage;
