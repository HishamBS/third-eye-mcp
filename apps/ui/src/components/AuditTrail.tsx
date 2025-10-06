'use client';

export interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  resource: string;
  details?: string;
}

export interface AuditTrailProps {
  records: AuditRecord[];
  loading: boolean;
}

export default function AuditTrail({ records, loading }: AuditTrailProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-brand-outline/60 bg-brand-paperElev/70 p-6">
        <p className="animate-pulse text-sm text-slate-400">Loading audit trail...</p>
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="rounded-2xl border border-brand-outline/60 bg-brand-paperElev/70 p-6">
        <p className="text-sm text-slate-400">No audit records found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div
          key={record.id}
          className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4 text-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">{record.action}</p>
              <p className="text-xs text-slate-400">{record.actor} · {record.resource}</p>
            </div>
            <time className="text-xs text-slate-500">
              {new Date(record.timestamp).toLocaleString()}
            </time>
          </div>
          {record.details && (
            <p className="mt-2 text-xs text-slate-300">{record.details}</p>
          )}
        </div>
      ))}
    </div>
  );
}
