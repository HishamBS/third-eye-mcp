/**
 * StatusBadge Component
 *
 * Displays approval/validation status with icon and color.
 * Uses SSOT constants - no hardcoded emojis or colors.
 */

import { DynamicIcon } from '@/components/ui/DynamicIcon';
import { getStatusBadgeConfig, type ApprovalStatus } from '@third-eye/constants';

export interface StatusBadgeProps {
  readonly status: ApprovalStatus;
  readonly size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-2 text-base',
} as const;

const ICON_SIZES = {
  sm: 12,
  md: 14,
  lg: 16,
} as const;

/**
 * Renders a status badge with icon, label, and appropriate color
 */
export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = getStatusBadgeConfig(status);
  const sizeClass = SIZE_CLASSES[size];
  const iconSize = ICON_SIZES[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${config.colorClass} ${sizeClass}`}>
      <DynamicIcon name={config.icon} size={iconSize} />
      <span>{config.label}</span>
    </span>
  );
}
