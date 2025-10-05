import clsx from 'clsx';

async function requestExport(sessionId: string, apiKey: string, format: 'pdf' | 'html') {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8000';
  const response = await fetch(`${base}/session/${encodeURIComponent(sessionId)}/export?format=${format}`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'X-Request-ID': crypto.randomUUID(),
    },
  });
  if (!response.ok) {
    throw new Error(`Export failed (${response.status})`);
  }
  return response.blob();
}

export interface ExportBarProps {
  sessionId: string;
  apiKey: string;
}

export function ExportBar({ sessionId, apiKey }: ExportBarProps) {
  const disabled = !sessionId || !apiKey;

  const triggerDownload = async (format: 'pdf' | 'html') => {
    try {
      const blob = await requestExport(sessionId, apiKey, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `third-eye-session-${sessionId}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Export failed');
    }
  };

  return (
    <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Compliance export</p>
          <h3 className="text-lg font-semibold text-white">Download timeline transcript</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={clsx('rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50', disabled ? 'cursor-not-allowed bg-brand-outline/40 text-slate-400' : 'bg-brand-accent text-brand-ink hover:bg-brand-primary')}
            disabled={disabled}
            onClick={() => triggerDownload('pdf')}
          >
            Export PDF
          </button>
          <button
            type="button"
            className={clsx('rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50', disabled ? 'cursor-not-allowed bg-brand-outline/40 text-slate-400' : 'border border-brand-outline/60 text-slate-200 hover:border-brand-accent hover:text-brand-accent')}
            disabled={disabled}
            onClick={() => triggerDownload('html')}
          >
            Export HTML
          </button>
        </div>
      </div>
      {disabled && <p className="mt-2 text-xs text-slate-400">Admin API key required to access exports.</p>}
    </section>
  );
}

export default ExportBar;
