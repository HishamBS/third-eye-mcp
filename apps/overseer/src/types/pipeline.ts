export type EyeType =
  | 'SHARINGAN'
  | 'PROMPT_HELPER'
  | 'JOGAN'
  | 'RINNEGAN_PLAN'
  | 'RINNEGAN_REVIEW'
  | 'RINNEGAN_FINAL'
  | 'MANGEKYO_SCAFFOLD'
  | 'MANGEKYO_IMPL'
  | 'MANGEKYO_TESTS'
  | 'MANGEKYO_DOCS'
  | 'TENSEIGAN'
  | 'BYAKUGAN'
  | 'RINNEGAN_FINAL';

export type PipelineEnvelopeType = 'eye_update' | 'settings_update' | 'tenseigan_claims' | 'user_input';

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
  status: 'in_progress' | 'approved' | 'blocked';
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
