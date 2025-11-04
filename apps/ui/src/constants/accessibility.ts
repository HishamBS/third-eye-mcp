/**
 * Accessibility Constants - Phase 20.1
 *
 * ARIA labels, roles, and accessibility-related text
 * Per R13: All text in SSOT
 * Per WCAG 2.1 AA: Proper labeling for screen readers
 */

/**
 * ARIA Labels for interactive elements
 */
export const ARIA_LABELS = {
  // Modal close buttons
  CLOSE_MODAL: 'Close modal',
  CLOSE_WELCOME: 'Close welcome modal',
  CLOSE_PERSONA_WIZARD: 'Close persona wizard',
  CLOSE_CUSTOM_EYE_WIZARD: 'Close custom eye wizard',
  CLOSE_TEMPLATE_SELECTOR: 'Close template selector',
  CLOSE_NODE_EDIT: 'Close node editor',
  CLOSE_EDGE_CONFIG: 'Close edge configuration',
  CLOSE_APPROVAL_MODAL: 'Close approval details',

  // Navigation
  SKIP_TO_CONTENT: 'Skip to main content',
  OPEN_NAV_MENU: 'Open navigation menu',
  CLOSE_NAV_MENU: 'Close navigation menu',

  // Wizards/steppers
  NEXT_STEP: 'Go to next step',
  PREVIOUS_STEP: 'Go to previous step',
  GO_TO_STEP: (step: number) => `Go to step ${step}`,

  // Toggles
  TOGGLE_THEME: 'Toggle theme',
  TOGGLE_MINIMAP: 'Toggle minimap',
  TOGGLE_GRID: 'Toggle grid',
  TOGGLE_ENABLED: 'Toggle enabled state',
  TOGGLE_GUIDANCE: 'Toggle guidance phase',
  TOGGLE_VALIDATION: 'Toggle validation phase',

  // Forms
  UPLOAD_FILE: 'Upload file',
  REMOVE_ITEM: (item: string) => `Remove ${item}`,
  ADD_ITEM: (item: string) => `Add ${item}`,
  EDIT_ITEM: (item: string) => `Edit ${item}`,
  DELETE_ITEM: (item: string) => `Delete ${item}`,

  // Session selector
  SELECT_AND_VIEW_SESSION: 'Select and view session',
  DELETE_SESSION: 'Delete session',
  CLEAR_SELECTION: 'Clear selection',
} as const;

/**
 * ARIA Descriptions for complex interactions
 */
export const ARIA_DESCRIPTIONS = {
  WIZARD_PROGRESS: (current: number, total: number) =>
    `Step ${current} of ${total}`,
  REQUIRED_FIELD: 'This field is required',
  OPTIONAL_FIELD: 'This field is optional',
  INVALID_INPUT: (reason: string) => `Invalid input: ${reason}`,
  LOADING: 'Loading...',
  SAVING: 'Saving...',
} as const;

/**
 * Skip link text
 */
export const SKIP_LINK = {
  TEXT: 'Skip to main content',
  TARGET_ID: 'main-content',
} as const;
