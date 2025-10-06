export function StatusBadge({ status }: { status: string }) {
  const colors = {
    approved: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
    blocked: 'bg-rose-500/20 text-rose-300 border-rose-400/40',
    pending: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
  };
  
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${colors[status as keyof typeof colors] || colors.pending}`}>
      {status}
    </span>
  );
}
