import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE, STATUS_BORDER_COLORS_SUBTLE } from '@/constants/color-mappings';

export function StatusBadge({ status }: { status: string }) {
  const colors = {
    approved: `${STATUS_BG_COLORS_SUBTLE.success} ${STATUS_TEXT_COLORS.success} ${STATUS_BORDER_COLORS_SUBTLE.success}`,
    blocked: `${STATUS_BG_COLORS_SUBTLE.error} ${STATUS_TEXT_COLORS.error} ${STATUS_BORDER_COLORS_SUBTLE.error}`,
    pending: `${STATUS_BG_COLORS_SUBTLE.idle} text-semantic-muted ${STATUS_BORDER_COLORS_SUBTLE.idle}`,
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${colors[status as keyof typeof colors] || colors.pending}`}>
      {status}
    </span>
  );
}
