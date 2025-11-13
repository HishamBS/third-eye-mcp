/**
 * Status Badge Constants
 *
 * Defines status badge configurations for UI display.
 * SSOT for status icons, colors, and labels.
 */

import { freezeTokens, TokenLiteral } from "./taxonomy";

export const ApprovalStatus = freezeTokens({
  APPROVED: "approved",
  REJECTED: "rejected",
  PENDING: "pending",
  REQUIRES_EVIDENCE: "requires_evidence",
  VERIFIED: "verified",
} as const);

export type ApprovalStatus = TokenLiteral<typeof ApprovalStatus>;

export interface StatusBadgeConfig {
  readonly label: string;
  readonly icon: string; // lucide-react icon name
  readonly colorClass: string; // Tailwind class names
}

/**
 * Status badge configurations
 */
export const STATUS_BADGE_CONFIGS: Readonly<
  Record<ApprovalStatus, StatusBadgeConfig>
> = Object.freeze({
  [ApprovalStatus.APPROVED]: {
    label: "Approved",
    icon: "check-circle",
    colorClass: "bg-green-500/20 text-green-400 border-green-500/40",
  },
  [ApprovalStatus.REJECTED]: {
    label: "Rejected",
    icon: "x-circle",
    colorClass: "bg-red-500/20 text-red-400 border-red-500/40",
  },
  [ApprovalStatus.PENDING]: {
    label: "Pending",
    icon: "clock",
    colorClass: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  },
  [ApprovalStatus.REQUIRES_EVIDENCE]: {
    label: "Requires Evidence",
    icon: "alert-triangle",
    colorClass: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  },
  [ApprovalStatus.VERIFIED]: {
    label: "Verified",
    icon: "badge-check",
    colorClass: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  },
});

/**
 * Get status badge configuration
 */
export function getStatusBadgeConfig(
  status: ApprovalStatus,
): StatusBadgeConfig {
  return STATUS_BADGE_CONFIGS[status];
}
