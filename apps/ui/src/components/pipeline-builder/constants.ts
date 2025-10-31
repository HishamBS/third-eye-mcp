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
  SAVE_AS_TEMPLATE: 'Save as Template',
  LOAD_TEMPLATE: 'Load Template',
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

/**
 * System Default Pipeline - Phase 10
 * Pre-configured 8-Eye validation flow
 * Per R13: Centralized default pipeline structure
 *
 * Flow: Overseer → Sharingan → Kyuubi → Jogan → Rinnegan → Mangekyo → Byakugan → Tenseigan
 */
export const SYSTEM_DEFAULT_PIPELINE = {
  nodes: [
    {
      id: 'node-overseer',
      type: 'eyeNode',
      position: { x: 100, y: 200 },
      data: {
        eyeId: 'overseer' as const,
        displayName: EYE_DISPLAY_NAMES.overseer,
        capabilities: [EYE_PRIMARY_CAPABILITIES.overseer],
        isCustom: false as const,
        stage: EYE_STAGES.overseer,
      },
    },
    {
      id: 'node-sharingan',
      type: 'eyeNode',
      position: { x: 400, y: 100 },
      data: {
        eyeId: 'sharingan' as const,
        displayName: EYE_DISPLAY_NAMES.sharingan,
        capabilities: [EYE_PRIMARY_CAPABILITIES.sharingan],
        isCustom: false as const,
        stage: EYE_STAGES.sharingan,
      },
    },
    {
      id: 'node-kyuubi',
      type: 'eyeNode',
      position: { x: 700, y: 100 },
      data: {
        eyeId: 'kyuubi' as const,
        displayName: EYE_DISPLAY_NAMES.kyuubi,
        capabilities: [EYE_PRIMARY_CAPABILITIES.kyuubi],
        isCustom: false as const,
        stage: EYE_STAGES.kyuubi,
      },
    },
    {
      id: 'node-jogan',
      type: 'eyeNode',
      position: { x: 1000, y: 100 },
      data: {
        eyeId: 'jogan' as const,
        displayName: EYE_DISPLAY_NAMES.jogan,
        capabilities: [EYE_PRIMARY_CAPABILITIES.jogan],
        isCustom: false as const,
        stage: EYE_STAGES.jogan,
      },
    },
    {
      id: 'node-rinnegan',
      type: 'eyeNode',
      position: { x: 400, y: 300 },
      data: {
        eyeId: 'rinnegan' as const,
        displayName: EYE_DISPLAY_NAMES.rinnegan,
        capabilities: [EYE_PRIMARY_CAPABILITIES.rinnegan],
        isCustom: false as const,
        stage: EYE_STAGES.rinnegan,
      },
    },
    {
      id: 'node-mangekyo',
      type: 'eyeNode',
      position: { x: 700, y: 300 },
      data: {
        eyeId: 'mangekyo' as const,
        displayName: EYE_DISPLAY_NAMES.mangekyo,
        capabilities: [EYE_PRIMARY_CAPABILITIES.mangekyo],
        isCustom: false as const,
        stage: EYE_STAGES.mangekyo,
      },
    },
    {
      id: 'node-byakugan',
      type: 'eyeNode',
      position: { x: 1000, y: 300 },
      data: {
        eyeId: 'byakugan' as const,
        displayName: EYE_DISPLAY_NAMES.byakugan,
        capabilities: [EYE_PRIMARY_CAPABILITIES.byakugan],
        isCustom: false as const,
        stage: EYE_STAGES.byakugan,
      },
    },
    {
      id: 'node-tenseigan',
      type: 'eyeNode',
      position: { x: 1300, y: 200 },
      data: {
        eyeId: 'tenseigan' as const,
        displayName: EYE_DISPLAY_NAMES.tenseigan,
        capabilities: [EYE_PRIMARY_CAPABILITIES.tenseigan],
        isCustom: false as const,
        stage: EYE_STAGES.tenseigan,
      },
    },
  ],
  edges: [
    {
      id: 'edge-overseer-sharingan',
      source: 'node-overseer',
      target: 'node-sharingan',
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: 'arrowclosed' },
      data: {
        condition: EDGE_CONDITION_TYPES.ALWAYS,
        enabled: true,
      },
    },
    {
      id: 'edge-sharingan-kyuubi',
      source: 'node-sharingan',
      target: 'node-kyuubi',
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: 'arrowclosed' },
      data: {
        condition: EDGE_CONDITION_TYPES.ALWAYS,
        enabled: true,
      },
    },
    {
      id: 'edge-kyuubi-jogan',
      source: 'node-kyuubi',
      target: 'node-jogan',
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: 'arrowclosed' },
      data: {
        condition: EDGE_CONDITION_TYPES.ALWAYS,
        enabled: true,
      },
    },
    {
      id: 'edge-jogan-rinnegan',
      source: 'node-jogan',
      target: 'node-rinnegan',
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: 'arrowclosed' },
      data: {
        condition: EDGE_CONDITION_TYPES.ALWAYS,
        enabled: true,
      },
    },
    {
      id: 'edge-rinnegan-mangekyo',
      source: 'node-rinnegan',
      target: 'node-mangekyo',
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: 'arrowclosed' },
      data: {
        condition: EDGE_CONDITION_TYPES.ALWAYS,
        enabled: true,
      },
    },
    {
      id: 'edge-mangekyo-byakugan',
      source: 'node-mangekyo',
      target: 'node-byakugan',
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: 'arrowclosed' },
      data: {
        condition: EDGE_CONDITION_TYPES.ALWAYS,
        enabled: true,
      },
    },
    {
      id: 'edge-byakugan-tenseigan',
      source: 'node-byakugan',
      target: 'node-tenseigan',
      type: 'smoothstep',
      animated: true,
      markerEnd: { type: 'arrowclosed' },
      data: {
        condition: EDGE_CONDITION_TYPES.ALWAYS,
        enabled: true,
      },
    },
  ],
} as const;

/**
 * Pipeline Template Text Constants - Phase 19.4
 * Per R13: No literal strings
 */
export const TEMPLATE_TEXT = {
  SELECTOR_TITLE: 'Pipeline Templates',
  SELECTOR_SUBTITLE: 'Choose a pre-built pipeline to get started',
  LOAD_BUTTON: 'Load Template',
  CANCEL_BUTTON: 'Cancel',
  SAVE_TITLE: 'Save as Template',
  SAVE_SUBTITLE: 'Save current pipeline as a reusable template',
  TEMPLATE_NAME_LABEL: 'Template Name',
  TEMPLATE_NAME_PLACEHOLDER: 'My Pipeline Template',
  TEMPLATE_DESC_LABEL: 'Description',
  TEMPLATE_DESC_PLACEHOLDER: 'Describe what this pipeline does...',
  SAVE_BUTTON: 'Save Template',
  TEMPLATE_SAVED: 'Template saved successfully',
  TEMPLATE_LOADED: 'Template loaded successfully',
} as const;

/**
 * Pre-built Pipeline Templates - Phase 19.4
 * Per R01: Single source of truth for templates
 */
export const PIPELINE_TEMPLATES = [
  {
    id: 'quick-validation',
    name: 'Quick Validation',
    description: 'Fast validation pipeline for simple prompts',
    nodes: [
      {
        id: 'node-overseer',
        type: 'eyeNode',
        position: { x: 100, y: 200 },
        data: {
          eyeId: 'overseer' as const,
          displayName: EYE_DISPLAY_NAMES.overseer,
          capabilities: [EYE_PRIMARY_CAPABILITIES.overseer],
          isCustom: false as const,
          stage: EYE_STAGES.overseer,
        },
      },
      {
        id: 'node-sharingan',
        type: 'eyeNode',
        position: { x: 400, y: 200 },
        data: {
          eyeId: 'sharingan' as const,
          displayName: EYE_DISPLAY_NAMES.sharingan,
          capabilities: [EYE_PRIMARY_CAPABILITIES.sharingan],
          isCustom: false as const,
          stage: EYE_STAGES.sharingan,
        },
      },
      {
        id: 'node-byakugan',
        type: 'eyeNode',
        position: { x: 700, y: 200 },
        data: {
          eyeId: 'byakugan' as const,
          displayName: EYE_DISPLAY_NAMES.byakugan,
          capabilities: [EYE_PRIMARY_CAPABILITIES.byakugan],
          isCustom: false as const,
          stage: EYE_STAGES.byakugan,
        },
      },
    ],
    edges: [
      {
        id: 'edge-overseer-sharingan',
        source: 'node-overseer',
        target: 'node-sharingan',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: 'arrowclosed' },
        data: { condition: EDGE_CONDITION_TYPES.ALWAYS, enabled: true },
      },
      {
        id: 'edge-sharingan-byakugan',
        source: 'node-sharingan',
        target: 'node-byakugan',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: 'arrowclosed' },
        data: { condition: EDGE_CONDITION_TYPES.ALWAYS, enabled: true },
      },
    ],
  },
  {
    id: 'code-review',
    name: 'Code Review Pipeline',
    description: 'Specialized pipeline for code validation with review steps',
    nodes: [
      {
        id: 'node-overseer',
        type: 'eyeNode',
        position: { x: 100, y: 200 },
        data: {
          eyeId: 'overseer' as const,
          displayName: EYE_DISPLAY_NAMES.overseer,
          capabilities: [EYE_PRIMARY_CAPABILITIES.overseer],
          isCustom: false as const,
          stage: EYE_STAGES.overseer,
        },
      },
      {
        id: 'node-rinnegan',
        type: 'eyeNode',
        position: { x: 400, y: 200 },
        data: {
          eyeId: 'rinnegan' as const,
          displayName: EYE_DISPLAY_NAMES.rinnegan,
          capabilities: [EYE_PRIMARY_CAPABILITIES.rinnegan],
          isCustom: false as const,
          stage: EYE_STAGES.rinnegan,
        },
      },
      {
        id: 'node-mangekyo',
        type: 'eyeNode',
        position: { x: 700, y: 200 },
        data: {
          eyeId: 'mangekyo' as const,
          displayName: EYE_DISPLAY_NAMES.mangekyo,
          capabilities: [EYE_PRIMARY_CAPABILITIES.mangekyo],
          isCustom: false as const,
          stage: EYE_STAGES.mangekyo,
        },
      },
      {
        id: 'node-tenseigan',
        type: 'eyeNode',
        position: { x: 1000, y: 200 },
        data: {
          eyeId: 'tenseigan' as const,
          displayName: EYE_DISPLAY_NAMES.tenseigan,
          capabilities: [EYE_PRIMARY_CAPABILITIES.tenseigan],
          isCustom: false as const,
          stage: EYE_STAGES.tenseigan,
        },
      },
    ],
    edges: [
      {
        id: 'edge-overseer-rinnegan',
        source: 'node-overseer',
        target: 'node-rinnegan',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: 'arrowclosed' },
        data: { condition: EDGE_CONDITION_TYPES.ALWAYS, enabled: true },
      },
      {
        id: 'edge-rinnegan-mangekyo',
        source: 'node-rinnegan',
        target: 'node-mangekyo',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: 'arrowclosed' },
        data: { condition: EDGE_CONDITION_TYPES.ALWAYS, enabled: true },
      },
      {
        id: 'edge-mangekyo-tenseigan',
        source: 'node-mangekyo',
        target: 'node-tenseigan',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: 'arrowclosed' },
        data: { condition: EDGE_CONDITION_TYPES.ALWAYS, enabled: true },
      },
    ],
  },
  {
    id: 'thorough-review',
    name: 'Thorough Review',
    description: 'Complete validation pipeline with all guidance and validation steps',
    nodes: SYSTEM_DEFAULT_PIPELINE.nodes,
    edges: SYSTEM_DEFAULT_PIPELINE.edges,
  },
] as const;
