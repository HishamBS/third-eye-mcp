/**
 * Eye-specific structured data type definitions and type guards.
 *
 * Each eye returns rich structured data in its BaseEnvelope `data` field.
 * These interfaces model that data for type-safe rendering.
 */

// ---------------------------------------------------------------------------
// Sharingan -- Ambiguity Detection
// ---------------------------------------------------------------------------
export interface SharinganData {
  ambiguityScore: number;
  confidence: number;
  questions: ReadonlyArray<{ id: string; text: string }>;
  resolved: Readonly<Record<string, string>>;
}

export function isSharinganData(
  d: Record<string, unknown>,
): d is SharinganData {
  return "ambiguityScore" in d && "questions" in d;
}

// ---------------------------------------------------------------------------
// Kyuubi -- Brief Alignment / Prompt Quality
// ---------------------------------------------------------------------------
export interface KyuubiData {
  briefAlignment: Readonly<{
    objective: boolean;
    audience: boolean;
    format: boolean;
    tone: boolean;
    constraints: boolean;
  }>;
  alignmentScore: number;
  questions: readonly string[];
  scopeClarity: number;
}

export function isKyuubiData(d: Record<string, unknown>): d is KyuubiData {
  return "briefAlignment" in d && "alignmentScore" in d;
}

// ---------------------------------------------------------------------------
// Jogan -- Intent Analysis
// ---------------------------------------------------------------------------
export interface JoganData {
  intentAnalysis: Readonly<{
    primary: string;
    secondary: string | null;
    scope: string;
    deliverables: readonly string[];
    riskLevel: "low" | "medium" | "high" | "critical";
  }>;
  confirmationPrompt: string | null;
  riskWarning: string | null;
}

export function isJoganData(d: Record<string, unknown>): d is JoganData {
  return "intentAnalysis" in d;
}

// ---------------------------------------------------------------------------
// Rinnegan -- Plan Review
// ---------------------------------------------------------------------------
export interface RinneganData {
  planReview: Readonly<{
    completeness: number;
    feasibility: number;
    dependencies: number;
    risks: number;
    successCriteria: number;
  }>;
  planQualityScore: number;
  recommendations: readonly string[];
}

export function isRinneganData(d: Record<string, unknown>): d is RinneganData {
  return "planReview" in d && "planQualityScore" in d;
}

// ---------------------------------------------------------------------------
// Mangekyo -- Code Review
// ---------------------------------------------------------------------------
export interface MangekyoIssue {
  severity: "critical" | "high" | "medium" | "low";
  file: string;
  line: number;
  description: string;
}

export interface MangekyoData {
  codeReview: Readonly<{
    structure: number;
    naming: number;
    errorHandling: number;
    typeSafety: number;
    performance: number;
    security: number;
    testing: number;
  }>;
  codeQualityScore: number;
  strengths: readonly string[];
  issues: readonly MangekyoIssue[];
}

export function isMangekyoData(d: Record<string, unknown>): d is MangekyoData {
  return "codeReview" in d && "codeQualityScore" in d;
}

// ---------------------------------------------------------------------------
// Tenseigan -- Evidence / Citation Review
// ---------------------------------------------------------------------------
export interface TenseiganData {
  evidenceReview: Readonly<{
    totalClaims: number;
    citedClaims: number;
    uncitedClaims: number;
  }>;
  citationQuality: Readonly<{
    primarySources: boolean;
    secondarySources: boolean;
    allAccessible: boolean;
    allCredible: boolean;
  }>;
  evidenceScore: number;
  unsupported: readonly string[];
}

export function isTenseiganData(
  d: Record<string, unknown>,
): d is TenseiganData {
  return "evidenceReview" in d && "citationQuality" in d;
}

// ---------------------------------------------------------------------------
// Byakugan -- Final Quality Review
// ---------------------------------------------------------------------------
export interface ByakuganData {
  finalReview: Readonly<{
    clarity: number;
    completeness: number;
    correctness: number;
    quality: number;
    readiness: number;
  }>;
  overallScore: number;
  strengths: readonly string[];
  issues: readonly string[];
}

export function isByakuganData(d: Record<string, unknown>): d is ByakuganData {
  return "finalReview" in d && "overallScore" in d;
}

// ---------------------------------------------------------------------------
// Shared renderer prop type
// ---------------------------------------------------------------------------
export interface EyeRendererProps {
  data: Record<string, unknown>;
  eyeColor: string;
}
