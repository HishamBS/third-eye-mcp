/**
 * Monitor Page Tab Configuration
 *
 * Defines tab structure for the Monitor page (Crown Jewel).
 * SSOT for tab identifiers, labels, and icon mappings.
 */

import { freezeTokens, TokenLiteral } from './taxonomy';

export const MonitorTabId = freezeTokens({
  TIMELINE: 'timeline',
  ROUTING: 'routing',
  CLARIFICATIONS: 'clarifications',
  INTENT: 'intent',
  EVIDENCE: 'evidence',
  RAW_JSON: 'raw',
} as const);

export type MonitorTabId = TokenLiteral<typeof MonitorTabId>;

export interface MonitorTabConfig {
  readonly id: MonitorTabId;
  readonly label: string;
  readonly icon: string; // lucide-react icon name
  readonly description: string;
}

/**
 * Tab configurations for Monitor page
 */
export const MONITOR_TABS: ReadonlyArray<MonitorTabConfig> = Object.freeze([
  {
    id: MonitorTabId.TIMELINE,
    label: 'Timeline',
    icon: 'timeline',
    description: 'Chat-style conversation log with Eye responses',
  },
  {
    id: MonitorTabId.ROUTING,
    label: 'Routing Decision',
    icon: 'route',
    description: 'Overseer-determined dynamic Eye sequence and rationale',
  },
  {
    id: MonitorTabId.CLARIFICATIONS,
    label: 'Clarifications',
    icon: 'help-circle',
    description: 'Outstanding and resolved clarification questions',
  },
  {
    id: MonitorTabId.INTENT,
    label: 'Intent Confirmation',
    icon: 'hand',
    description: 'Jogan intent analysis and human approval status',
  },
  {
    id: MonitorTabId.EVIDENCE,
    label: 'Evidence & Validation',
    icon: 'search',
    description: 'Code review, fact validation, and final approval results',
  },
  {
    id: MonitorTabId.RAW_JSON,
    label: 'Raw JSON',
    icon: 'braces',
    description: 'Complete pipeline event data in JSON format',
  },
]);

/**
 * Get tab configuration by ID
 */
export function getMonitorTab(id: MonitorTabId): MonitorTabConfig | undefined {
  return MONITOR_TABS.find((tab) => tab.id === id);
}
