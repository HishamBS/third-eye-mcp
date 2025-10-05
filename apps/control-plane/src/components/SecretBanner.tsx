import { useEffect, useState } from 'react';
import type { ApiKeySecret } from '../types/admin';

export interface SecretBannerProps {
  secret: ApiKeySecret | null;
  onDismiss: () => void;
}

export function SecretBanner({ secret, onDismiss }: SecretBannerProps) {
  const [copied, setCopied] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  useEffect(() => {
    if (!secret) {
      setCopied(false);
      setCopiedCurl(false);
    }
  }, [secret]);

  if (!secret) return null;

  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://your-control-plane-domain';
  const curlCommand = `curl -H "X-API-Key: ${secret.secret}" ${origin}/admin/metrics/overview`;

  const downloadJson = () => {
    const payload = {
      id: secret.id,
      secret: secret.secret,
      expires_at: secret.expires_at,
      saved_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${secret.id || 'api-key'}-credential.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-accent-primary/40 bg-accent-primary/10 p-4 text-sm text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-accent-primary">Save this secret now</p>
          <p className="mt-2 font-mono text-base text-white">{secret.secret}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(secret.secret);
              setCopied(true);
              setCopiedCurl(false);
            }}
            className="rounded-full border border-accent-primary/60 px-4 py-2 text-xs font-semibold text-accent-primary transition hover:bg-accent-primary/20"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(curlCommand);
              setCopiedCurl(true);
            }}
            className="rounded-full border border-accent-primary/40 px-4 py-2 text-xs font-semibold text-accent-primary transition hover:bg-accent-primary/15"
          >
            {copiedCurl ? 'cURL copied!' : 'Copy as cURL'}
          </button>
          <button
            type="button"
            onClick={downloadJson}
            className="rounded-full border border-surface-outline/40 px-4 py-2 text-xs text-slate-200 transition hover:border-accent-primary hover:text-accent-primary"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-surface-outline/60 px-4 py-2 text-xs text-slate-200 transition hover:border-accent-primary hover:text-accent-primary"
          >
            Dismiss
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-300">Secrets are shown only once. Store it in your vault before leaving this page.</p>
      <p className="text-xs text-slate-400">
        Tip: use the generated cURL command against your control-plane API to verify connectivity, or stash the JSON payload in your secrets manager.
      </p>
    </div>
  );
}

export default SecretBanner;
