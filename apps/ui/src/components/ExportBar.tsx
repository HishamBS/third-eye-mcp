'use client';

import clsx from 'clsx';
import { useDialog } from '@/hooks/useDialog';

type ExportFormat = 'pdf' | 'html' | 'json' | 'md';

async function requestExport(sessionId: string, format: ExportFormat) {
  const base = (process.env.NEXT_PUBLIC_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:7070';
  const response = await fetch(`${base}/api/export/${sessionId}?format=${format}`, {
    method: 'GET',
    headers: {
      'X-Request-ID': crypto.randomUUID(),
    },
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Export failed (${response.status})`);
  }
  if (format === 'json') {
    return response.blob();
  }
  return response.blob();
}

export interface ExportBarProps {
  sessionId: string;
}

export function ExportBar({ sessionId }: ExportBarProps) {
  const dialog = useDialog();
  const disabled = !sessionId;

  const triggerDownload = async (format: ExportFormat) => {
    try {
      const blob = await requestExport(sessionId, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `third-eye-session-${sessionId}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      await dialog.alert('Export Failed', error instanceof Error ? error.message : 'Export failed');
    }
  };

  return (
    <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Session Export</p>
          <h3 className="text-lg font-semibold text-white">Download session data</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={clsx('rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50', disabled ? 'cursor-not-allowed bg-brand-outline/40 text-slate-400' : 'bg-brand-accent text-brand-ink hover:bg-brand-primary')}
            disabled={disabled}
            onClick={() => triggerDownload('pdf')}
          >
            PDF
          </button>
          <button
            type="button"
            className={clsx('rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50', disabled ? 'cursor-not-allowed bg-brand-outline/40 text-slate-400' : 'border border-brand-outline/60 text-slate-200 hover:border-brand-accent hover:text-brand-accent')}
            disabled={disabled}
            onClick={() => triggerDownload('html')}
          >
            HTML
          </button>
          <button
            type="button"
            className={clsx('rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50', disabled ? 'cursor-not-allowed bg-brand-outline/40 text-slate-400' : 'border border-brand-outline/60 text-slate-200 hover:border-brand-accent hover:text-brand-accent')}
            disabled={disabled}
            onClick={() => triggerDownload('json')}
          >
            JSON
          </button>
          <button
            type="button"
            className={clsx('rounded-full px-4 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50', disabled ? 'cursor-not-allowed bg-brand-outline/40 text-slate-400' : 'border border-brand-outline/60 text-slate-200 hover:border-brand-accent hover:text-brand-accent')}
            disabled={disabled}
            onClick={() => triggerDownload('md')}
          >
            Markdown
          </button>
        </div>
      </div>
      {disabled && <p className="mt-2 text-xs text-slate-400">Select a session to enable exports.</p>}
    </section>
  );
}

export default ExportBar;
