/**
 * TabButton Component
 *
 * Professional tab button with icon and label.
 * Uses SSOT tab configurations - no hardcoded emojis.
 */

import { DynamicIcon } from '@/components/ui/DynamicIcon';
import type { MonitorTabConfig } from '@third-eye/constants';

export interface TabButtonProps {
  readonly tab: MonitorTabConfig;
  readonly isActive: boolean;
  readonly onClick: () => void;
}

/**
 * Renders a tab button with icon and label
 */
export function TabButton({ tab, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
        isActive
          ? 'border-b-2 border-brand-accent text-brand-accent'
          : 'text-semantic-muted hover:text-brand-foreground'
      }`}
      aria-selected={isActive}
      role="tab"
    >
      <DynamicIcon name={tab.icon} size={16} />
      <span>{tab.label}</span>
    </button>
  );
}
