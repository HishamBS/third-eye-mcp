/**
 * Pipeline Builder Constants - SSOT for Eye metadata and UI strings
 * Per R13: No magic strings or literal values
 */

import type { EyeName } from '@third-eye/types';

/**
 * Eye Display Names - Human-readable names
 */
export const EYE_DISPLAY_NAMES: Record<EyeName, string> = {
  overseer: 'Overseer',
  sharingan: 'Sharingan',
  kyuubi: 'Kyuubi',
  jogan: 'Jogan',
  rinnegan: 'Rinnegan',
  mangekyo: 'Mangekyo',
  tenseigan: 'Tenseigan',
  byakugan: 'Byakugan',
} as const;

/**
 * Eye Short Descriptions
 */
export const EYE_DESCRIPTIONS: Record<EyeName, string> = {
  overseer: 'Navigator & Router',
  sharingan: 'Ambiguity Detector',
  kyuubi: 'Prompt Helper',
  jogan: 'Intent Confirmer',
  rinnegan: 'Planning & Architecture',
  mangekyo: 'Code Review',
  tenseigan: 'Evidence Validator',
  byakugan: 'Final Approval',
} as const;

/**
 * Eye Badges - Category identifiers
 */
export const EYE_BADGES: Record<EyeName, string> = {
  overseer: 'BUILT-IN',
  sharingan: 'BUILT-IN',
  kyuubi: 'BUILT-IN',
  jogan: 'BUILT-IN',
  rinnegan: 'BUILT-IN',
  mangekyo: 'BUILT-IN',
  tenseigan: 'BUILT-IN',
  byakugan: 'BUILT-IN',
} as const;

/**
 * Eye Stages - GUIDANCE or VALIDATION phase
 */
export type EyeStage = 'GUIDANCE' | 'VALIDATION' | 'BOTH' | 'ROUTER';

export const EYE_STAGES: Record<EyeName, EyeStage> = {
  overseer: 'ROUTER',
  sharingan: 'GUIDANCE',
  kyuubi: 'GUIDANCE',
  jogan: 'GUIDANCE',
  rinnegan: 'VALIDATION',
  mangekyo: 'VALIDATION',
  tenseigan: 'VALIDATION',
  byakugan: 'VALIDATION',
} as const;

/**
 * Eye Capabilities - Primary capability tags
 */
export const EYE_PRIMARY_CAPABILITIES: Record<EyeName, string> = {
  overseer: 'auto_routing',
  sharingan: 'clarification',
  kyuubi: 'briefing',
  jogan: 'intent_confirmation',
  rinnegan: 'pipeline_planning',
  mangekyo: 'code_review',
  tenseigan: 'factual_validation',
  byakugan: 'final_approval',
} as const;

/**
 * Pipeline Builder UI Text Constants
 */
export const PIPELINE_UI_TEXT = {
  PAGE_TITLE: 'Pipeline Builder',
  PAGE_SUBTITLE: 'Design custom validation workflows with drag-and-drop Eyes',

  // Toolbar
  TOOLBAR_RUN: 'Run Pipeline',
  TOOLBAR_AUTO_LAYOUT: 'Auto Layout',
  TOOLBAR_SAVE: 'Save Pipeline',
  TOOLBAR_LOAD: 'Load Template',
  TOOLBAR_EXPORT: 'Export',
  TOOLBAR_IMPORT: 'Import',

  // Context Menu
  MENU_EDIT: 'Edit Configuration',
  MENU_DUPLICATE: 'Duplicate',
  MENU_COPY: 'Copy',
  MENU_DELETE: 'Delete',
  MENU_VIEW_PERSONA: 'View Persona',
  MENU_TEST_EYE: 'Test Eye',
  MENU_ADD_EYE: 'Add Eye',
  MENU_PASTE: 'Paste',
  MENU_ZOOM_FIT: 'Zoom to Fit',
  MENU_RESET_ZOOM: 'Reset Zoom',
  MENU_DELETE_CONNECTION: 'Delete Connection',
  MENU_EDIT_STYLE: 'Edit Style',

  // Validation Messages
  VALIDATION_NO_ORPHANS: 'All Eyes must be connected',
  VALIDATION_GUIDANCE_FIRST: 'Guidance Eyes must come before Validation Eyes',
  VALIDATION_NEEDS_OVERSEER: 'Pipeline must start with Overseer',
  VALIDATION_NEEDS_APPROVAL: 'Pipeline must end with final approval Eye (e.g., Byakugan)',
  VALIDATION_NO_CYCLES: 'Pipeline cannot have circular dependencies',
  VALIDATION_NO_SELF_CONNECTION: 'Cannot connect Eye to itself',
  VALIDATION_CONNECTION_EXISTS: 'Connection already exists',

  // Status Messages
  STATUS_PIPELINE_SAVED: 'Pipeline saved successfully',
  STATUS_PIPELINE_LOADED: 'Pipeline loaded successfully',
  STATUS_PIPELINE_DELETED: 'Pipeline deleted successfully',
  STATUS_PIPELINE_EXPORTED: 'Pipeline exported successfully',

  // Empty States
  EMPTY_STATE_NO_NODES: 'Drag Eyes from the palette to build your pipeline',
  EMPTY_STATE_NO_PIPELINES: 'No saved pipelines yet',

} as const;

/**
 * Node Dimensions
 */
export const NODE_DIMENSIONS = {
  WIDTH: 180,
  HEIGHT: 120,
  ICON_SIZE: 48,
  HANDLE_SIZE: 12,
  PADDING: 16,
} as const;

/**
 * Canvas Settings
 */
export const CANVAS_SETTINGS = {
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 3.0,
  DEFAULT_ZOOM: 1.0,
  GRID_SIZE: 20,
  NODE_SPACING: 100,
  RANK_SPACING: 150,
} as const;

/**
 * Keyboard Shortcuts
 */
export const KEYBOARD_SHORTCUTS = {
  DELETE: 'Delete',
  COPY: 'Ctrl+C / ⌘+C',
  PASTE: 'Ctrl+V / ⌘+V',
  DUPLICATE: 'Ctrl+D / ⌘+D',
  UNDO: 'Ctrl+Z / ⌘+Z',
  REDO: 'Ctrl+Shift+Z / ⌘+Shift+Z',
  SELECT_ALL: 'Ctrl+A / ⌘+A',
  DESELECT: 'Escape',
  RESET_ZOOM: 'Ctrl+0 / ⌘+0',
  ZOOM_FIT: 'Ctrl+1 / ⌘+1',
  RUN: 'R',
  AUTO_LAYOUT: 'L',
  TOGGLE_MINIMAP: 'M',
  TOGGLE_GRID: 'G',
  FIND: 'Ctrl+F / ⌘+F',
} as const;

/**
 * Layout Constants - Phase 10
 * Per R13: No magic numbers
 */
export const LAYOUT = {
  TOOLBAR_HEIGHT: 56,
  PALETTE_WIDTH: 280,
  PALETTE_COLLAPSED_WIDTH: 64,
  MINIMAP_WIDTH: 200,
  MINIMAP_HEIGHT: 150,
  NODE_SPACING: 50,
  ZOOM_DURATION: 300,
  ZOOM_TO_NODE_SCALE: 1.5,
  FIT_VIEW_PADDING: 0.15,
  HEADER_HEIGHT: 64,
  BREADCRUMB_HEIGHT: 48,
} as const;

/**
 * Toolbar Text Constants - Phase 10
 * Per R13: No literal strings
 */
export const TOOLBAR_TEXT = {
  SAVE: 'Save Pipeline',
  ACTIVATE: 'Activate',
  NEW: 'New Pipeline',
  EXPORT: 'Export',
  IMPORT: 'Import',
  VALIDATE: 'Validate',
  MORE_ACTIONS: 'More Actions',
  TOGGLE_MINIMAP: 'Toggle Minimap',
  TOGGLE_GRID: 'Toggle Grid',
  AUTO_LAYOUT: 'Auto Layout',
  ZOOM_FIT: 'Fit View',
  UNDO: 'Undo',
  REDO: 'Redo',
  COPY: 'Copy',
  PASTE: 'Paste',
  DELETE: 'Delete',
  SELECT_PIPELINE: 'Select Pipeline',
  SYSTEM_DEFAULT: 'System Default',
} as const;

/**
 * Eye Palette Text Constants - Phase 10
 * Per R13: No literal strings
 */
export const PALETTE_TEXT = {
  TITLE: 'Eyes',
  SEARCH_PLACEHOLDER: 'Search eyes...',
  BUILTIN_SECTION: 'Built-in Eyes',
  CUSTOM_SECTION: 'Custom Eyes',
  NO_RESULTS: 'No eyes found',
  COLLAPSE: 'Collapse',
  EXPAND: 'Expand',
  DRAG_HINT: 'Drag to canvas',
  NO_CUSTOM: 'No custom eyes yet',
  CREATE_CUSTOM: 'Create Custom Eye',
} as const;

/**
 * Node Edit Modal Text Constants - Phase 10
 * Per R13: No literal strings
 */
export const NODE_EDIT_TEXT = {
  TITLE: 'Edit Eye Node',
  EYE_LABEL: 'Eye',
  CAPABILITIES_LABEL: 'Capabilities',
  CONFIG_LABEL: 'Custom Configuration',
  SAVE: 'Save Changes',
  CANCEL: 'Cancel',
  DELETE: 'Delete Node',
  ADD_CAPABILITY: 'Add Capability',
  REMOVE_CAPABILITY: 'Remove',
  CONFIG_JSON_HINT: 'Enter custom JSON configuration',
  VALIDATION_INVALID_JSON: 'Invalid JSON format',
  VALIDATION_REQUIRED: 'This field is required',
} as const;

/**
 * Edge Config Modal Text Constants - Phase 10
 * Per R13: No literal strings
 */
export const EDGE_TEXT = {
  TITLE: 'Configure Edge',
  CONDITION_LABEL: 'Condition Type',
  THRESHOLD_LABEL: 'Threshold Value',
  MAX_ITERATIONS_LABEL: 'Max Iterations',
  DELETE: 'Delete Edge',
  CANCEL: 'Cancel',
  SAVE: 'Save Changes',
  DESCRIPTION_LABEL: 'Description',
  ENABLED_LABEL: 'Enabled',
  CONDITION_HINT: 'Select when this edge should be traversed',
  THRESHOLD_HINT: 'Minimum score required (0-100)',
  MAX_ITERATIONS_HINT: 'Maximum number of loop iterations',
} as const;

/**
 * Edge Condition Types - Phase 10 (SSOT for loop conditions)
 * Per R01: Single source of truth
 */
export const EDGE_CONDITION_TYPES = {
  SCORE_THRESHOLD: 'score_threshold',
  APPROVAL_REQUIRED: 'approval_required',
  MAX_ITERATIONS: 'max_iterations',
  ALWAYS: 'always',
  NEVER: 'never',
} as const;

export type EdgeConditionType = typeof EDGE_CONDITION_TYPES[keyof typeof EDGE_CONDITION_TYPES];

/**
 * Edge Condition Labels - Phase 10
 * Human-readable labels for condition types
 */
export const EDGE_CONDITION_LABELS: Record<EdgeConditionType, string> = {
  [EDGE_CONDITION_TYPES.SCORE_THRESHOLD]: 'Score Threshold',
  [EDGE_CONDITION_TYPES.APPROVAL_REQUIRED]: 'Approval Required',
  [EDGE_CONDITION_TYPES.MAX_ITERATIONS]: 'Max Iterations',
  [EDGE_CONDITION_TYPES.ALWAYS]: 'Always',
  [EDGE_CONDITION_TYPES.NEVER]: 'Never',
} as const;

/**
 * Edge Condition Descriptions - Phase 10
 * Per R13: Centralized descriptions
 */
export const EDGE_CONDITION_DESCRIPTIONS: Record<EdgeConditionType, string> = {
  [EDGE_CONDITION_TYPES.SCORE_THRESHOLD]: 'Traverse only if output score meets threshold',
  [EDGE_CONDITION_TYPES.APPROVAL_REQUIRED]: 'Traverse only after manual approval',
  [EDGE_CONDITION_TYPES.MAX_ITERATIONS]: 'Loop back until max iterations reached',
  [EDGE_CONDITION_TYPES.ALWAYS]: 'Always traverse this edge',
  [EDGE_CONDITION_TYPES.NEVER]: 'Never traverse (disabled)',
} as const;

/**
 * Pipeline Defaults - Phase 10
 * Per R13: Centralized default values
 */
export const PIPELINE_DEFAULTS = {
  DEFAULT_THRESHOLD: 80,
  DEFAULT_MAX_ITERATIONS: 5,
  MIN_THRESHOLD: 0,
  MAX_THRESHOLD: 100,
  MIN_ITERATIONS: 1,
  MAX_ITERATIONS: 20,
} as const;
