/**
 * Monitor Page Tab Configuration
 *
 * Defines tab structure for the Monitor page (Crown Jewel).
 * SSOT for tab identifiers, labels, and icon mappings.
 *
 * Per R13: NO magic string literals - all text from constants
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

/**
 * SSOT for Monitor Tab Labels - Per R13
 */
const MONITOR_TAB_LABELS = Object.freeze({
  TIMELINE: 'Timeline',
  ROUTING: 'Routing Decision',
  CLARIFICATIONS: 'Clarifications',
  INTENT: 'Intent Confirmation',
  EVIDENCE: 'Evidence & Validation',
  RAW_JSON: 'Raw JSON',
} as const);

/**
 * SSOT for Monitor Tab Icons (lucide-react icon names) - Per R13
 */
const MONITOR_TAB_ICONS = Object.freeze({
  TIMELINE: 'timeline',
  ROUTING: 'route',
  CLARIFICATIONS: 'help-circle',
  INTENT: 'hand',
  EVIDENCE: 'search',
  RAW_JSON: 'braces',
} as const);

/**
 * SSOT for Monitor Tab Descriptions - Per R13
 */
const MONITOR_TAB_DESCRIPTIONS = Object.freeze({
  TIMELINE: 'Chat-style conversation log with Eye responses',
  ROUTING: 'Overseer-determined dynamic Eye sequence and rationale',
  CLARIFICATIONS: 'Outstanding and resolved clarification questions',
  INTENT: 'Jogan intent analysis and human approval status',
  EVIDENCE: 'Code review, fact validation, and final approval results',
  RAW_JSON: 'Complete pipeline event data in JSON format',
} as const);

export interface MonitorTabConfig {
  readonly id: MonitorTabId;
  readonly label: string;
  readonly icon: string; // lucide-react icon name
  readonly description: string;
}

/**
 * Tab configurations for Monitor page
 * Per R13: Uses constants from SSOT, no magic literals
 */
export const MONITOR_TABS: ReadonlyArray<MonitorTabConfig> = Object.freeze([
  {
    id: MonitorTabId.TIMELINE,
    label: MONITOR_TAB_LABELS.TIMELINE,
    icon: MONITOR_TAB_ICONS.TIMELINE,
    description: MONITOR_TAB_DESCRIPTIONS.TIMELINE,
  },
  {
    id: MonitorTabId.ROUTING,
    label: MONITOR_TAB_LABELS.ROUTING,
    icon: MONITOR_TAB_ICONS.ROUTING,
    description: MONITOR_TAB_DESCRIPTIONS.ROUTING,
  },
  {
    id: MonitorTabId.CLARIFICATIONS,
    label: MONITOR_TAB_LABELS.CLARIFICATIONS,
    icon: MONITOR_TAB_ICONS.CLARIFICATIONS,
    description: MONITOR_TAB_DESCRIPTIONS.CLARIFICATIONS,
  },
  {
    id: MonitorTabId.INTENT,
    label: MONITOR_TAB_LABELS.INTENT,
    icon: MONITOR_TAB_ICONS.INTENT,
    description: MONITOR_TAB_DESCRIPTIONS.INTENT,
  },
  {
    id: MonitorTabId.EVIDENCE,
    label: MONITOR_TAB_LABELS.EVIDENCE,
    icon: MONITOR_TAB_ICONS.EVIDENCE,
    description: MONITOR_TAB_DESCRIPTIONS.EVIDENCE,
  },
  {
    id: MonitorTabId.RAW_JSON,
    label: MONITOR_TAB_LABELS.RAW_JSON,
    icon: MONITOR_TAB_ICONS.RAW_JSON,
    description: MONITOR_TAB_DESCRIPTIONS.RAW_JSON,
  },
]);

/**
 * Get tab configuration by ID
 */
export function getMonitorTab(id: MonitorTabId): MonitorTabConfig | undefined {
  return MONITOR_TABS.find((tab) => tab.id === id);
}
