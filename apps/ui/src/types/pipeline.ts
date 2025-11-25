// Phase 10 imports - React Flow types for pipeline builder
import type { Node, Edge } from "reactflow";
import type { EyeName } from "@third-eye/types";
import type { EdgeConditionType } from "@/components/pipeline-builder/constants";

export type EyeType =
  | "SHARINGAN"
  | "KYUUBI"
  | "JOGAN"
  | "RINNEGAN_PLAN"
  | "RINNEGAN_REVIEW"
  | "RINNEGAN_FINAL"
  | "MANGEKYO_SCAFFOLD"
  | "MANGEKYO_IMPL"
  | "MANGEKYO_TESTS"
  | "MANGEKYO_DOCS"
  | "TENSEIGAN"
  | "BYAKUGAN"
  | "RINNEGAN_FINAL";

export type PipelineEnvelopeType =
  | "eye_update"
  | "settings_update"
  | "tenseigan_claims"
  | "user_input";

export interface PipelineEvent {
  type: PipelineEnvelopeType;
  session_id: string;
  eye?: string | null;
  ok?: boolean | null;
  code?: string | null;
  tool_version?: string | null;
  md?: string | null;
  data?: Record<string, unknown>;
  ts?: string | null;
}

export interface SessionSettingsPayload {
  ambiguity_threshold?: number;
  citation_cutoff?: number;
  consistency_tolerance?: number;
  require_rollback?: boolean;
  mangekyo?: string;
}

export interface EyeState {
  eye: EyeType | string;
  ok: boolean | null;
  code: string | null;
  md: string | null;
  toolVersion: string | null;
  data: Record<string, unknown>;
  ts: string | null;
}

export interface EvidenceClaim {
  text: string;
  start: number;
  end: number;
  citation: string | null;
  confidence: number;
}

export interface PipelineStoreState {
  sessionId: string | null;
  connected: boolean;
  connectionAttempts: number;
  eyes: Record<string, EyeState>;
  events: PipelineEvent[];
  settings: SessionSettingsPayload | null;
  claims: EvidenceClaim[];
  error: string | null;
}

export type PipelineStoreActions = {
  setSessionId: (sessionId: string) => void;
  switchSession: (sessionId: string) => void;
  reset: () => void;
  addEvent: (event: PipelineEvent) => void;
  setEyeState: (eye: string, state: EyeState) => void;
  setSettings: (settings: SessionSettingsPayload) => void;
  setClaims: (claims: EvidenceClaim[]) => void;
  setConnectionState: (connected: boolean) => void;
  setError: (message: string | null) => void;
  incrementAttempts: () => void;
};

export type PipelineStore = PipelineStoreState & PipelineStoreActions;

export interface ClarificationQuestion {
  id: string;
  text: string;
}

export interface ClarificationContext {
  questions: ClarificationQuestion[];
  ambiguityScore?: number;
  isCodeRelated?: boolean;
}

export interface SessionOverview {
  session_id: string;
  title: string;
  status: "in_progress" | "approved" | "blocked";
  created_at: string | null;
  last_event_at: string | null;
  tenant?: string | null;
  eye_counts: {
    approvals: number;
    rejections: number;
  };
}

export interface SessionEyeDetail {
  eye: string | null;
  ok: boolean | null;
  code: string | null;
  tool_version: string | null;
  md: string | null;
  data: Record<string, unknown>;
  ts: string | null;
}

export interface SessionTimelineEvent {
  eye: string | null;
  event_type: string | null;
  ok: boolean | null;
  code: string | null;
  tool_version: string | null;
  md: string | null;
  data: Record<string, unknown>;
  ts: string | null;
}

export interface SessionDetail extends SessionOverview {
  eyes: SessionEyeDetail[];
  events: SessionTimelineEvent[];
  settings: SessionSettingsPayload;
}

export interface HeroMetrics {
  requests_per_minute: number;
  approvals: number;
  rejections: number;
  open_blockers: number;
  dominant_provider: string | null;
  token_usage: {
    input: number;
    output: number;
  };
}

export interface SessionSummary {
  session_id: string;
  tenant?: string | null;
  status?: string | null;
  hero_metrics?: HeroMetrics | null;
  eyes?: Array<{
    eye: string;
    ok: boolean | null;
    code: string | null;
    tool_version?: string | null;
    last_event_at?: string | null;
  }>;
  duel_status?: Record<string, unknown> | null;
  evidence?: Record<string, unknown> | null;
  operations?: Record<string, unknown> | null;
}

// ============================================================================
// Pipeline Builder Types - Phase 10
// React Flow visualization types for designing and editing pipelines
// Per R07: Strict typing, no 'any' types
// ============================================================================

/**
 * Eye Node Data - Data attached to each Eye node in the pipeline
 * Per R07: Strict typing with precise types
 */
export interface EyeNodeData {
  eyeId: EyeName | string;
  displayName?: string;
  capabilities?: string[];
  customConfig?: Record<string, unknown>;
  iconSvg?: string; // Custom SVG content from database
  stage?: "GUIDANCE" | "VALIDATION" | "ROUTER" | "BOTH";
  label?: string; // For control nodes
  switchConfig?: Record<string, unknown>; // For switch nodes
  ifConfig?: Record<string, unknown>; // For if nodes
  loopConfig?: Record<string, unknown>; // For loop nodes
}

/**
 * Valid Pipeline Node Types
 * Per R13: SSOT for node types
 */
export type PipelineNodeType =
  | "eyeNode"
  | "switch"
  | "if"
  | "loop_over_items"
  | "terminal"
  | "user_input";

/**
 * Pipeline Node - React Flow node supporting all node types
 * Per R07: Extends React Flow Node with strict typing
 * Supports: eyeNode, switch, if, loop_over_items, terminal, user_input
 */
export interface PipelineNode extends Node<EyeNodeData> {
  type: PipelineNodeType;
  data: EyeNodeData;
}

/**
 * Edge Condition Data - Configuration for conditional routing
 * Per R07: All fields explicitly typed
 */
export interface EdgeConditionData {
  condition: EdgeConditionType;
  threshold?: number; // 0-100 for score_threshold
  maxIterations?: number; // For max_iterations condition
  description?: string;
  enabled?: boolean;
}

/**
 * Pipeline Edge - React Flow edge with condition data
 * Per R07: Extends React Flow Edge with strict typing
 */
export interface PipelineEdge extends Edge<EdgeConditionData> {
  data?: EdgeConditionData;
}

/**
 * Complete Pipeline Definition
 * Per R07: All fields explicitly typed
 *
 * Note: Backend returns workflowJson containing {nodes, edges}
 * This matches the database schema from apps/server/src/routes/pipelines.ts
 */
export interface Pipeline {
  id: string;
  name: string;
  description: string;
  workflowJson: {
    nodes: PipelineNode[];
    edges: PipelineEdge[];
  };
  category: string;
  active: boolean;
  version: number;
  createdAt: string | Date;
}

/**
 * Capability Mapping - Used for connection validation
 * Per R07: Strict typing for capability analysis
 */
export interface CapabilityMapping {
  eyeId: string;
  inputCapabilities: string[];
  outputCapabilities: string[];
}

/**
 * Pipeline Validation Result
 * Per R07: Explicitly typed validation errors
 */
export interface PipelineValidationError {
  type:
    | "orphan_node"
    | "missing_overseer"
    | "missing_approval"
    | "incompatible_connection"
    | "invalid_condition";
  nodeId?: string;
  edgeId?: string;
  message: string;
}

export interface PipelineValidationResult {
  valid: boolean;
  errors: PipelineValidationError[];
  warnings: PipelineValidationError[];
}

/**
 * Eye Definition - Unified type for ALL eyes (no built-in vs custom distinction)
 * Per R07: Single interface, all fields optional where appropriate
 */
export interface EyeDefinition {
  id: string;
  name: string;
  description: string;
  iconSvg?: string;
  capabilities: string[];
  version?: number;
  stage?: "GUIDANCE" | "VALIDATION" | "ROUTER" | "BOTH";
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}
