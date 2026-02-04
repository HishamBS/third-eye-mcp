/**
 * Pipeline Stages Constants - SSOT
 *
 * Per R01: Single source of truth for pipeline stage values
 * Per R13: No hardcoded strings in components
 */

/**
 * Pipeline execution stages
 */
export const PIPELINE_STAGES = Object.freeze({
  GUIDANCE: "guidance",
  VALIDATION: "validation",
} as const);

export type PipelineStage =
  (typeof PIPELINE_STAGES)[keyof typeof PIPELINE_STAGES];

/**
 * Pipeline stage display labels
 */
export const PIPELINE_STAGE_LABELS = Object.freeze({
  [PIPELINE_STAGES.GUIDANCE]: "Guidance Phase",
  [PIPELINE_STAGES.VALIDATION]: "Validation Phase",
} as const);

/**
 * Pipeline stage descriptions
 */
export const PIPELINE_STAGE_DESCRIPTIONS = Object.freeze({
  [PIPELINE_STAGES.GUIDANCE]:
    "Initial analysis and recommendation phase where Eyes provide guidance",
  [PIPELINE_STAGES.VALIDATION]:
    "Verification phase where results are validated for quality and correctness",
} as const);

/**
 * Pipeline stage icons (emoji)
 */
export const PIPELINE_STAGE_ICONS = Object.freeze({
  [PIPELINE_STAGES.GUIDANCE]: "🔍",
  [PIPELINE_STAGES.VALIDATION]: "✓",
} as const);

/**
 * Pipeline stage colors - Tailwind classes
 */
export const PIPELINE_STAGE_COLORS = Object.freeze({
  [PIPELINE_STAGES.GUIDANCE]: {
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    textColor: "text-blue-700 dark:text-blue-300",
    badgeColor: "bg-blue-100 dark:bg-blue-800",
  },
  [PIPELINE_STAGES.VALIDATION]: {
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
    textColor: "text-green-700 dark:text-green-300",
    badgeColor: "bg-green-100 dark:bg-green-800",
  },
} as const);

/**
 * Pipeline status values
 */
export const PIPELINE_STATUS = Object.freeze({
  RUNNING: "running",
  PAUSED: "paused",
  COMPLETED: "completed",
  FAILED: "failed",
  AWAITING_CLARIFICATION: "awaiting_clarification",
  AWAITING_CONFIRMATION: "awaiting_confirmation",
} as const);

export type PipelineStatus =
  (typeof PIPELINE_STATUS)[keyof typeof PIPELINE_STATUS];

/**
 * Pipeline status display labels
 */
export const PIPELINE_STATUS_LABELS = Object.freeze({
  [PIPELINE_STATUS.RUNNING]: "Running",
  [PIPELINE_STATUS.PAUSED]: "Paused",
  [PIPELINE_STATUS.COMPLETED]: "Completed",
  [PIPELINE_STATUS.FAILED]: "Failed",
  [PIPELINE_STATUS.AWAITING_CLARIFICATION]: "Awaiting Clarification",
  [PIPELINE_STATUS.AWAITING_CONFIRMATION]: "Awaiting Confirmation",
} as const);

/**
 * Pipeline status colors
 */
export const PIPELINE_STATUS_COLORS = Object.freeze({
  [PIPELINE_STATUS.RUNNING]: {
    bgColor: "bg-blue-500",
    textColor: "text-white",
    dotColor: "bg-blue-500",
  },
  [PIPELINE_STATUS.PAUSED]: {
    bgColor: "bg-yellow-500",
    textColor: "text-white",
    dotColor: "bg-yellow-500",
  },
  [PIPELINE_STATUS.COMPLETED]: {
    bgColor: "bg-green-500",
    textColor: "text-white",
    dotColor: "bg-green-500",
  },
  [PIPELINE_STATUS.FAILED]: {
    bgColor: "bg-red-500",
    textColor: "text-white",
    dotColor: "bg-red-500",
  },
  [PIPELINE_STATUS.AWAITING_CLARIFICATION]: {
    bgColor: "bg-amber-500",
    textColor: "text-white",
    dotColor: "bg-amber-500",
  },
  [PIPELINE_STATUS.AWAITING_CONFIRMATION]: {
    bgColor: "bg-purple-500",
    textColor: "text-white",
    dotColor: "bg-purple-500",
  },
} as const);

/**
 * Check if stage is valid
 */
export function isPipelineStage(stage: string): stage is PipelineStage {
  return Object.values(PIPELINE_STAGES).includes(stage as PipelineStage);
}

/**
 * Check if status is valid
 */
export function isPipelineStatus(status: string): status is PipelineStatus {
  return Object.values(PIPELINE_STATUS).includes(status as PipelineStatus);
}

/**
 * Get stage configuration
 */
export function getStageConfig(stage: string) {
  const s = stage as PipelineStage;
  return {
    label: PIPELINE_STAGE_LABELS[s] ?? stage,
    description: PIPELINE_STAGE_DESCRIPTIONS[s] ?? "",
    icon: PIPELINE_STAGE_ICONS[s] ?? "📋",
    colors: PIPELINE_STAGE_COLORS[s] ?? PIPELINE_STAGE_COLORS.guidance,
  };
}

/**
 * Get status configuration
 */
export function getStatusConfig(status: string) {
  const s = status as PipelineStatus;
  return {
    label: PIPELINE_STATUS_LABELS[s] ?? status,
    colors: PIPELINE_STATUS_COLORS[s] ?? PIPELINE_STATUS_COLORS.running,
  };
}
