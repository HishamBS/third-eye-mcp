/**
 * Pipeline UI Constants
 *
 * SSOT for pipeline visualization, routing decision display, and runtime highlighting
 * Per R13: NO magic numbers, string literals, or inline styles
 */

import { freezeTokens, tokenValues } from "./taxonomy";
import type { TokenLiteral } from "./taxonomy";

/**
 * Pipeline Layout Constants
 */
export const PIPELINE_NODE_SPACING_HORIZONTAL = 400;
export const PIPELINE_NODE_SPACING_VERTICAL = 250;
export const PIPELINE_SWITCH_NODE_SPACING = 300;
export const PIPELINE_ANNOTATION_OFFSET_Y = 120;
export const PIPELINE_START_NODE_X = 50;
export const PIPELINE_START_NODE_Y = 400;

/**
 * Runtime Highlighting Constants
 */
export const ACTIVE_PATH_GLOW_COLOR = "ring-4 ring-emerald-500/50 shadow-lg shadow-emerald-500/30";
export const ACTIVE_PATH_NODE_BORDER = "border-emerald-500 border-4";
export const ACTIVE_PATH_EDGE_STYLE = "stroke-emerald-500 stroke-[3px]";
export const INACTIVE_PATH_OPACITY = 0.3;
export const INACTIVE_PATH_FILTER = "grayscale(60%)";
export const ACTIVE_NODE_PULSE_ANIMATION = "animate-pulse";
export const ACTIVE_EDGE_FLOW_ANIMATION = "animate-flow";

/**
 * Animation Durations (milliseconds)
 */
export const ROUTING_ANIMATION_DURATION = 300;
export const PATH_HIGHLIGHT_TRANSITION = 400;
export const METADATA_OVERLAY_FADE = 200;
export const SESSION_SELECTOR_DROPDOWN_ANIMATION = 250;

/**
 * Routing Decision Metadata Panel Constants
 */
export const METADATA_PANEL_TITLE = "Routing Decision";
export const METADATA_PANEL_SUBTITLE = "Overseer Analysis & Path Selection";
export const METADATA_FIELD_REQUEST_TYPE = "Request Type";
export const METADATA_FIELD_CONTENT_DOMAIN = "Content Domain";
export const METADATA_FIELD_CONFIDENCE = "Confidence Score";
export const METADATA_FIELD_COMPLEXITY = "Complexity";
export const METADATA_FIELD_ESTIMATED_DURATION = "Estimated Duration";
export const METADATA_FIELD_ACTUAL_DURATION = "Actual Duration";
export const METADATA_FIELD_REASONING = "Routing Reasoning";
export const METADATA_BUTTON_COPY_JSON = "Copy Routing JSON";
export const METADATA_BUTTON_VIEW_IN_MONITOR = "View in Monitor";
export const METADATA_EMPTY_STATE = "Select a session to view routing decision";

/**
 * Pipeline Info Panel Constants
 */
export const PIPELINE_INFO_PANEL_TITLE = "Routing Decision Tree";
export const PIPELINE_INFO_PANEL_DESCRIPTION = "Comprehensive visualization showing all possible Overseer routing paths based on request type and content domain.";
export const PIPELINE_INFO_LEGEND_TITLE = "Legend";
export const PIPELINE_INFO_LEGEND_EYE_NODE = "Eye (Persona Execution)";
export const PIPELINE_INFO_LEGEND_SWITCH_NODE = "Routing Decision Point";
export const PIPELINE_INFO_LEGEND_ANNOTATION = "Explanatory Note";
export const PIPELINE_INFO_LEGEND_ACTIVE_PATH = "Active Path (Selected Session)";
export const PIPELINE_INFO_LEGEND_INACTIVE_PATH = "Alternative Path";
export const PIPELINE_INFO_STATS_TITLE = "Pipeline Statistics";
export const PIPELINE_INFO_STAT_TOTAL_PATHS = "Total Routing Paths";
export const PIPELINE_INFO_STAT_EYE_COUNT = "Available Eyes";
export const PIPELINE_INFO_STAT_DECISION_POINTS = "Decision Points";

/**
 * Session Selector Constants
 */
export const SESSION_SELECTOR_PLACEHOLDER = "Select a session to highlight its routing path";
export const SESSION_SELECTOR_SEARCH_PLACEHOLDER = "Search sessions...";
export const SESSION_SELECTOR_NO_RESULTS = "No sessions found";
export const SESSION_SELECTOR_LOADING = "Loading sessions...";
export const SESSION_SELECTOR_ERROR = "Failed to load sessions";
export const SESSION_SELECTOR_LABEL_ACTIVE = "Active";
export const SESSION_SELECTOR_LABEL_COMPLETED = "Completed";
export const SESSION_SELECTOR_LABEL_FAILED = "Failed";

/**
 * Interactive Controls Constants
 */
export const CONTROLS_BUTTON_FIT_VIEW = "Fit View";
export const CONTROLS_BUTTON_ZOOM_IN = "Zoom In";
export const CONTROLS_BUTTON_ZOOM_OUT = "Zoom Out";
export const CONTROLS_BUTTON_RESET = "Reset";
export const CONTROLS_BUTTON_EXPORT_PNG = "Export as PNG";
export const CONTROLS_BUTTON_EXPORT_SVG = "Export as SVG";
export const CONTROLS_BUTTON_EXPORT_JSON = "Export as JSON";
export const CONTROLS_TOGGLE_SHOW_ALL_PATHS = "Show All Paths";
export const CONTROLS_TOGGLE_HIGHLIGHT_SESSION = "Highlight Session Path";
export const CONTROLS_TOGGLE_COMPARE_SESSIONS = "Compare Sessions";
export const CONTROLS_LAYOUT_HORIZONTAL = "Horizontal Layout";
export const CONTROLS_LAYOUT_VERTICAL = "Vertical Layout";
export const CONTROLS_LAYOUT_RADIAL = "Radial Layout";

/**
 * Annotation Node Constants
 */
export const ANNOTATION_ICON_INFO = "info";
export const ANNOTATION_ICON_ALERT = "alert";
export const ANNOTATION_ICON_LIGHTBULB = "lightbulb";
export const ANNOTATION_BORDER_STYLE = "border-2 border-dashed border-brand-outline/40";
export const ANNOTATION_BG_COLOR = "bg-brand-surface/60 backdrop-blur-sm";
export const ANNOTATION_TEXT_COLOR = "text-brand-foreground/80";
export const ANNOTATION_COLLAPSED_HEIGHT = 40;
export const ANNOTATION_EXPANDED_MIN_HEIGHT = 100;

/**
 * Annotation Content (Explanatory Text)
 */
export const ANNOTATION_OVERSEER_TITLE = "Overseer Analysis";
export const ANNOTATION_OVERSEER_CONTENT = "Analyzes incoming request to determine:\n• Request type (NEW_TASK, DRAFT_REVIEW, VALIDATION_ONLY)\n• Content domain (TEXT, CODE, PLAN, MIXED)\n• Complexity level (SIMPLE, MEDIUM, COMPLEX)\n• Required capabilities for optimal routing";

export const ANNOTATION_REQUEST_TYPE_TITLE = "Request Type Routing";
export const ANNOTATION_REQUEST_TYPE_CONTENT = "Branches based on user intent:\n• **NEW_TASK**: Full pipeline with guidance + validation\n• **DRAFT_REVIEW**: Skip guidance, focus on validation only\n• **VALIDATION_ONLY**: Quick fact-check or approval pass";

export const ANNOTATION_CONTENT_DOMAIN_TITLE = "Content Domain Analysis";
export const ANNOTATION_CONTENT_DOMAIN_CONTENT = "Routes based on content type:\n• **CODE**: Requires strategic planning (Rinnegan) + code review (Mangekyo)\n• **TEXT**: Focuses on fact-checking (Tenseigan) + evidence grounding\n• **PLAN**: Architectural analysis (Sharingan + Rinnegan)\n• **MIXED**: Hybrid approach with multiple validation layers";

export const ANNOTATION_FINAL_VALIDATION_TITLE = "Final Validation Phase";
export const ANNOTATION_FINAL_VALIDATION_CONTENT = "All routing paths converge at Tenseigan (fact validation) followed by Byakugan (ultimate approval authority).\n\nTenseigan ensures accuracy, evidence grounding, and claim verification.\nByakugan provides final sign-off and quality assurance.";

export const ANNOTATION_CAPABILITY_MATRIX_TITLE = "Capability-Based Routing";
export const ANNOTATION_CAPABILITY_MATRIX_CONTENT = "Overseer uses a capability matrix to match required capabilities with available Eyes:\n• CLARIFICATION: Sharingan\n• PROMPT_STRUCTURING: Kyuubi\n• INTENT_VALIDATION: Jogan\n• STRATEGIC_PLANNING: Rinnegan\n• CODE_REVIEW: Mangekyo\n• FACT_VALIDATION: Tenseigan\n• FINAL_APPROVAL: Byakugan";

/**
 * Master Pipeline Metadata
 */
export const MASTER_PIPELINE_ID = "overseer-dynamic-master";
export const MASTER_PIPELINE_NAME = "Overseer Dynamic Routing - All Paths";
export const MASTER_PIPELINE_DESCRIPTION = "Comprehensive visualization showing all possible Overseer routing branches based on request type and content domain. This pipeline represents the complete decision tree for dynamic routing.";
export const MASTER_PIPELINE_CATEGORY = "system";
export const MASTER_PIPELINE_VERSION = 1;

/**
 * Routing Decision API Constants
 */
export const API_ROUTE_ROUTING_DECISIONS = "/api/routing-decisions";
export const API_ROUTE_ROUTING_DECISIONS_BY_SESSION = "/api/routing-decisions/:sessionId";

/**
 * Error Messages
 */
export const ERROR_ROUTING_DECISION_NOT_FOUND = "Routing decision not found for this session";
export const ERROR_ROUTING_DECISION_FETCH_FAILED = "Failed to fetch routing decision";
export const ERROR_SESSION_LIST_FETCH_FAILED = "Failed to fetch sessions for selector";
export const ERROR_PIPELINE_EXPORT_FAILED = "Failed to export pipeline";

/**
 * Success Messages
 */
export const SUCCESS_ROUTING_JSON_COPIED = "Routing decision JSON copied to clipboard";
export const SUCCESS_PIPELINE_EXPORTED = "Pipeline exported successfully";

/**
 * Glassmorphism Styles (Metadata Overlay)
 */
export const GLASSMORPHISM_BG = "bg-brand-surface/80 backdrop-blur-md";
export const GLASSMORPHISM_BORDER = "border border-brand-outline/30";
export const GLASSMORPHISM_SHADOW = "shadow-xl shadow-brand-shadow/20";
export const GLASSMORPHISM_FULL = "bg-brand-surface/80 backdrop-blur-md border border-brand-outline/30 shadow-xl shadow-brand-shadow/20";

/**
 * Confidence Score Display
 */
export const CONFIDENCE_SCORE_HIGH_THRESHOLD = 0.8;
export const CONFIDENCE_SCORE_MEDIUM_THRESHOLD = 0.5;
export const CONFIDENCE_SCORE_HIGH_COLOR = "text-emerald-500";
export const CONFIDENCE_SCORE_MEDIUM_COLOR = "text-amber-500";
export const CONFIDENCE_SCORE_LOW_COLOR = "text-red-500";
export const CONFIDENCE_SCORE_FORMAT_DECIMALS = 0; // Show as percentage

/**
 * Node Type Labels (for Legend)
 */
export const NODE_TYPE_EYE = "Eye Node";
export const NODE_TYPE_SWITCH = "Switch Node";
export const NODE_TYPE_ANNOTATION = "Annotation Node";
export const NODE_TYPE_START = "Start Node";
export const NODE_TYPE_TERMINAL = "Terminal Node";

/**
 * Edge Label Constants
 */
export const EDGE_LABEL_NEW_TASK = "NEW_TASK";
export const EDGE_LABEL_DRAFT_REVIEW = "DRAFT_REVIEW";
export const EDGE_LABEL_VALIDATION_ONLY = "VALIDATION_ONLY";
export const EDGE_LABEL_CONTENT_TEXT = "TEXT";
export const EDGE_LABEL_CONTENT_CODE = "CODE";
export const EDGE_LABEL_CONTENT_PLAN = "PLAN";
export const EDGE_LABEL_CONTENT_MIXED = "MIXED";
export const EDGE_LABEL_TO_FINAL_VALIDATION = "To Final Validation";
export const EDGE_LABEL_APPROVED = "APPROVED";
export const EDGE_LABEL_FALLBACK = "Fallback";

/**
 * Tooltip Content Templates
 */
export const formatNodeTooltip = (eyeName: string, stage: string): string =>
  `${eyeName} - ${stage} Phase`;

export const formatExecutionTooltip = (
  eyeName: string,
  duration: number,
  verdict: string,
): string =>
  `${eyeName}\nExecution Time: ${duration}ms\nVerdict: ${verdict}`;

export const formatConfidenceTooltip = (confidence: number): string =>
  `Confidence Score: ${(confidence * 100).toFixed(0)}%`;

export const formatComplexityDisplay = (complexity: string): string =>
  complexity.charAt(0).toUpperCase() + complexity.slice(1);

export const formatDurationDisplay = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

/**
 * Request Type Display Names
 */
export const RequestTypeDisplay = freezeTokens({
  NEW_TASK: "New Task",
  DRAFT_REVIEW: "Draft Review",
  VALIDATION_ONLY: "Validation Only",
} as const);

export type RequestTypeDisplay = TokenLiteral<typeof RequestTypeDisplay>;
export const ALL_REQUEST_TYPE_DISPLAYS = tokenValues(RequestTypeDisplay);

/**
 * Content Domain Display Names
 */
export const ContentDomainDisplay = freezeTokens({
  TEXT: "Text Content",
  CODE: "Code Content",
  PLAN: "Planning/Architecture",
  MIXED: "Mixed Content",
} as const);

export type ContentDomainDisplay = TokenLiteral<typeof ContentDomainDisplay>;
export const ALL_CONTENT_DOMAIN_DISPLAYS = tokenValues(ContentDomainDisplay);

/**
 * Complexity Display Names
 */
export const ComplexityDisplay = freezeTokens({
  SIMPLE: "Simple",
  MEDIUM: "Medium",
  COMPLEX: "Complex",
} as const);

export type ComplexityDisplay = TokenLiteral<typeof ComplexityDisplay>;
export const ALL_COMPLEXITY_DISPLAYS = tokenValues(ComplexityDisplay);
