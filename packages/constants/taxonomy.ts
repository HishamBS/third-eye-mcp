/**
 * Core taxonomy enumerations for Third Eye MCP.
 *
 * These frozen maps provide the single source of truth for identifiers,
 * codes, and tokens that must never drift across packages.
 */

type TokenRecord = Record<string, string>;
export type TokenLiteral<TTokens extends TokenRecord> = TTokens[keyof TTokens];

export const freezeTokens = <T extends Record<string, string>>(
  tokens: T,
): Readonly<T> => Object.freeze(tokens);

export const tokenValues = <T extends Record<string, string>>(
  tokens: Readonly<T>,
): readonly TokenLiteral<T>[] => Object.freeze(Object.values(tokens));

export const EyeId = freezeTokens({
  OVERSEER: "overseer",
  SHARINGAN: "sharingan",
  KYUUBI: "kyuubi",
  JOGAN: "jogan",
  RINNEGAN: "rinnegan",
  MANGEKYO: "mangekyo",
  TENSEIGAN: "tenseigan",
  BYAKUGAN: "byakugan",
});

export type EyeId = TokenLiteral<typeof EyeId>;
export const ALL_EYE_IDS = tokenValues(EyeId);

export const EyeSource = freezeTokens({
  BUILT_IN: "built-in",
  CUSTOM: "custom",
});

export type EyeSource = TokenLiteral<typeof EyeSource>;
export const ALL_EYE_SOURCES = tokenValues(EyeSource);

export const EyeStageToken = freezeTokens({
  GUIDANCE: "guidance",
  VALIDATION: "validation",
});

export type EyeStageToken = TokenLiteral<typeof EyeStageToken>;
export const ALL_EYE_STAGE_TOKENS = tokenValues(EyeStageToken);

export const EYE_STAGE_LABELS: Record<EyeStageToken, string> = Object.freeze({
  [EyeStageToken.GUIDANCE]: "Guidance",
  [EyeStageToken.VALIDATION]: "Validation",
});

export const EyeCapability = freezeTokens({
  ORCHESTRATION: "orchestration",
  ROUTING: "routing",
  CLARIFICATION: "clarification",
  AMBIGUITY_DETECTION: "ambiguity_detection",
  PROMPT_STRUCTURING: "prompt_structuring",
  REQUIREMENTS_SYNTHESIS: "requirements_synthesis",
  INTENT_VALIDATION: "intent_validation",
  RISK_GUARDRAILS: "risk_guardrails",
  FACT_VALIDATION: "fact_validation",
  EVIDENCE_GROUNDING: "evidence_grounding",
  CODE_REVIEW: "code_review",
  QUALITY_ASSURANCE: "quality_assurance",
  STRATEGIC_PLANNING: "strategic_planning",
  ARCHITECTURE_VALIDATION: "architecture_validation",
  FINAL_APPROVAL: "final_approval",
  OUTCOME_SYNTHESIS: "outcome_synthesis",
});

export type EyeCapability = TokenLiteral<typeof EyeCapability>;
export const ALL_EYE_CAPABILITIES = tokenValues(EyeCapability);

export const EYE_CAPABILITY_LABELS: Record<EyeCapability, string> =
  Object.freeze({
    [EyeCapability.ORCHESTRATION]: "Orchestration",
    [EyeCapability.ROUTING]: "Dynamic Routing",
    [EyeCapability.CLARIFICATION]: "Clarification",
    [EyeCapability.AMBIGUITY_DETECTION]: "Ambiguity Detection",
    [EyeCapability.PROMPT_STRUCTURING]: "Prompt Structuring",
    [EyeCapability.REQUIREMENTS_SYNTHESIS]: "Requirements Synthesis",
    [EyeCapability.INTENT_VALIDATION]: "Intent Validation",
    [EyeCapability.RISK_GUARDRAILS]: "Risk Guardrails",
    [EyeCapability.FACT_VALIDATION]: "Fact Validation",
    [EyeCapability.EVIDENCE_GROUNDING]: "Evidence Grounding",
    [EyeCapability.CODE_REVIEW]: "Code Review",
    [EyeCapability.QUALITY_ASSURANCE]: "Quality Assurance",
    [EyeCapability.STRATEGIC_PLANNING]: "Strategic Planning",
    [EyeCapability.ARCHITECTURE_VALIDATION]: "Architecture Validation",
    [EyeCapability.FINAL_APPROVAL]: "Final Approval",
    [EyeCapability.OUTCOME_SYNTHESIS]: "Outcome Synthesis",
  });

export const CapabilityCategory = freezeTokens({
  GUIDANCE: "guidance",
  VALIDATION: "validation",
  CODE_QUALITY: "code-quality",
  PLANNING: "planning",
  ORCHESTRATION: "orchestration",
  SAFETY: "safety",
});

export type CapabilityCategory = TokenLiteral<typeof CapabilityCategory>;
export const ALL_CAPABILITY_CATEGORIES = tokenValues(CapabilityCategory);

export const CAPABILITY_CATEGORY_MAP: Record<
  EyeCapability,
  CapabilityCategory
> = Object.freeze({
  [EyeCapability.ORCHESTRATION]: CapabilityCategory.ORCHESTRATION,
  [EyeCapability.ROUTING]: CapabilityCategory.ORCHESTRATION,
  [EyeCapability.CLARIFICATION]: CapabilityCategory.GUIDANCE,
  [EyeCapability.AMBIGUITY_DETECTION]: CapabilityCategory.GUIDANCE,
  [EyeCapability.PROMPT_STRUCTURING]: CapabilityCategory.GUIDANCE,
  [EyeCapability.REQUIREMENTS_SYNTHESIS]: CapabilityCategory.GUIDANCE,
  [EyeCapability.INTENT_VALIDATION]: CapabilityCategory.GUIDANCE,
  [EyeCapability.RISK_GUARDRAILS]: CapabilityCategory.SAFETY,
  [EyeCapability.FACT_VALIDATION]: CapabilityCategory.VALIDATION,
  [EyeCapability.EVIDENCE_GROUNDING]: CapabilityCategory.VALIDATION,
  [EyeCapability.CODE_REVIEW]: CapabilityCategory.CODE_QUALITY,
  [EyeCapability.QUALITY_ASSURANCE]: CapabilityCategory.VALIDATION,
  [EyeCapability.STRATEGIC_PLANNING]: CapabilityCategory.PLANNING,
  [EyeCapability.ARCHITECTURE_VALIDATION]: CapabilityCategory.PLANNING,
  [EyeCapability.FINAL_APPROVAL]: CapabilityCategory.VALIDATION,
  [EyeCapability.OUTCOME_SYNTHESIS]: CapabilityCategory.ORCHESTRATION,
});

export const CAPABILITY_CATEGORY_LABELS: Record<CapabilityCategory, string> =
  Object.freeze({
    [CapabilityCategory.GUIDANCE]: "Guidance",
    [CapabilityCategory.VALIDATION]: "Validation",
    [CapabilityCategory.CODE_QUALITY]: "Code Quality",
    [CapabilityCategory.PLANNING]: "Planning",
    [CapabilityCategory.ORCHESTRATION]: "Orchestration",
    [CapabilityCategory.SAFETY]: "Safety",
  });

export const CAPABILITY_CATEGORY_COLORS: Record<
  CapabilityCategory,
  { bg: string; text: string; border: string }
> = Object.freeze({
  [CapabilityCategory.GUIDANCE]: {
    bg: "bg-blue-500/20",
    text: "text-blue-300",
    border: "border-blue-500/40",
  },
  [CapabilityCategory.VALIDATION]: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-300",
    border: "border-emerald-500/40",
  },
  [CapabilityCategory.CODE_QUALITY]: {
    bg: "bg-purple-500/20",
    text: "text-purple-300",
    border: "border-purple-500/40",
  },
  [CapabilityCategory.PLANNING]: {
    bg: "bg-indigo-500/20",
    text: "text-indigo-300",
    border: "border-indigo-500/40",
  },
  [CapabilityCategory.ORCHESTRATION]: {
    bg: "bg-amber-500/20",
    text: "text-amber-300",
    border: "border-amber-500/40",
  },
  [CapabilityCategory.SAFETY]: {
    bg: "bg-red-500/20",
    text: "text-red-300",
    border: "border-red-500/40",
  },
});

export const BUILTIN_EYE_CAPABILITIES: Readonly<
  Record<EyeId, readonly EyeCapability[]>
> = Object.freeze({
  [EyeId.OVERSEER]: [
    EyeCapability.ORCHESTRATION,
    EyeCapability.ROUTING,
    EyeCapability.RISK_GUARDRAILS,
    EyeCapability.OUTCOME_SYNTHESIS,
  ],
  [EyeId.SHARINGAN]: [
    EyeCapability.CLARIFICATION,
    EyeCapability.AMBIGUITY_DETECTION,
    EyeCapability.RISK_GUARDRAILS,
  ],
  [EyeId.KYUUBI]: [
    EyeCapability.PROMPT_STRUCTURING,
    EyeCapability.REQUIREMENTS_SYNTHESIS,
  ],
  [EyeId.JOGAN]: [
    EyeCapability.INTENT_VALIDATION,
    EyeCapability.CLARIFICATION,
    EyeCapability.RISK_GUARDRAILS,
  ],
  [EyeId.RINNEGAN]: [
    EyeCapability.STRATEGIC_PLANNING,
    EyeCapability.ARCHITECTURE_VALIDATION,
    EyeCapability.QUALITY_ASSURANCE,
  ],
  [EyeId.MANGEKYO]: [
    EyeCapability.CODE_REVIEW,
    EyeCapability.QUALITY_ASSURANCE,
    EyeCapability.RISK_GUARDRAILS,
  ],
  [EyeId.TENSEIGAN]: [
    EyeCapability.FACT_VALIDATION,
    EyeCapability.EVIDENCE_GROUNDING,
    EyeCapability.OUTCOME_SYNTHESIS,
  ],
  [EyeId.BYAKUGAN]: [
    EyeCapability.FINAL_APPROVAL,
    EyeCapability.OUTCOME_SYNTHESIS,
    EyeCapability.QUALITY_ASSURANCE,
  ],
});

export const EyeStatusCode = freezeTokens({
  OK: "OK",
  OK_WITH_NOTES: "OK_WITH_NOTES",
  OK_NO_CLARIFICATION_NEEDED: "OK_NO_CLARIFICATION_NEEDED",
  OK_INTENT_CONFIRMED: "OK_INTENT_CONFIRMED",
  OK_PROMPT_READY: "OK_PROMPT_READY",
  OK_GUIDE: "OK_GUIDE",
  OK_SCHEMA_EMITTED: "OK_SCHEMA_EMITTED",
  OK_NEXT_EYE: "OK_NEXT_EYE",
  OK_PLAN_APPROVED: "OK_PLAN_APPROVED",
  OK_SCAFFOLD_APPROVED: "OK_SCAFFOLD_APPROVED",
  OK_IMPL_APPROVED: "OK_IMPL_APPROVED",
  OK_TESTS_APPROVED: "OK_TESTS_APPROVED",
  OK_DOCS_APPROVED: "OK_DOCS_APPROVED",
  OK_CODE_APPROVED: "OK_CODE_APPROVED",
  OK_TEXT_VALIDATED: "OK_TEXT_VALIDATED",
  OK_CONSISTENT: "OK_CONSISTENT",
  OK_ALL_APPROVED: "OK_ALL_APPROVED",
  REJECT_AMBIGUOUS: "REJECT_AMBIGUOUS",
  REJECT_UNSAFE: "REJECT_UNSAFE",
  REJECT_INCOMPLETE: "REJECT_INCOMPLETE",
  REJECT_INCONSISTENT: "REJECT_INCONSISTENT",
  REJECT_NO_EVIDENCE: "REJECT_NO_EVIDENCE",
  REJECT_BAD_PLAN: "REJECT_BAD_PLAN",
  REJECT_CODE_ISSUES: "REJECT_CODE_ISSUES",
  E_NEEDS_CLARIFICATION: "E_NEEDS_CLARIFICATION",
  E_INTENT_UNCONFIRMED: "E_INTENT_UNCONFIRMED",
  E_PLAN_INCOMPLETE: "E_PLAN_INCOMPLETE",
  E_REASONING_MISSING: "E_REASONING_MISSING",
  E_SCAFFOLD_ISSUES: "E_SCAFFOLD_ISSUES",
  E_IMPL_ISSUES: "E_IMPL_ISSUES",
  E_TESTS_INSUFFICIENT: "E_TESTS_INSUFFICIENT",
  E_DOCS_MISSING: "E_DOCS_MISSING",
  E_CITATIONS_MISSING: "E_CITATIONS_MISSING",
  E_CONTRADICTION_DETECTED: "E_CONTRADICTION_DETECTED",
  E_PHASES_INCOMPLETE: "E_PHASES_INCOMPLETE",
  NEED_CLARIFICATION: "NEED_CLARIFICATION",
  NEED_MORE_CONTEXT: "NEED_MORE_CONTEXT",
  SUGGEST_ALTERNATIVE: "SUGGEST_ALTERNATIVE",
  AWAIT_CONFIRMATION: "AWAIT_CONFIRMATION",
  GUIDANCE_COMPLETE: "GUIDANCE_COMPLETE",
  EYE_ERROR: "EYE_ERROR",
  EYE_TIMEOUT: "EYE_TIMEOUT",
  INVALID_ENVELOPE: "INVALID_ENVELOPE",
});

export type EyeStatusCode = TokenLiteral<typeof EyeStatusCode>;
export const ALL_EYE_STATUS_CODES = tokenValues(EyeStatusCode);

export const EYE_ALLOWED_STATUS_CODES: Readonly<
  Record<EyeId, readonly EyeStatusCode[]>
> = Object.freeze({
  [EyeId.OVERSEER]: Object.freeze([
    EyeStatusCode.OK_NEXT_EYE,
    EyeStatusCode.OK_GUIDE,
    EyeStatusCode.OK_SCHEMA_EMITTED,
    EyeStatusCode.NEED_CLARIFICATION,
    EyeStatusCode.NEED_MORE_CONTEXT,
    EyeStatusCode.AWAIT_CONFIRMATION,
    EyeStatusCode.REJECT_UNSAFE,
    EyeStatusCode.REJECT_INCOMPLETE,
    EyeStatusCode.REJECT_NO_EVIDENCE,
    EyeStatusCode.E_NEEDS_CLARIFICATION,
    EyeStatusCode.E_REASONING_MISSING,
    EyeStatusCode.EYE_ERROR,
    EyeStatusCode.EYE_TIMEOUT,
    EyeStatusCode.INVALID_ENVELOPE,
  ]),
  [EyeId.SHARINGAN]: Object.freeze([
    EyeStatusCode.OK_NO_CLARIFICATION_NEEDED,
    EyeStatusCode.OK_WITH_NOTES,
    EyeStatusCode.NEED_CLARIFICATION,
    EyeStatusCode.NEED_MORE_CONTEXT,
    EyeStatusCode.REJECT_AMBIGUOUS,
    EyeStatusCode.E_NEEDS_CLARIFICATION,
    EyeStatusCode.EYE_ERROR,
    EyeStatusCode.EYE_TIMEOUT,
    EyeStatusCode.INVALID_ENVELOPE,
  ]),
  [EyeId.KYUUBI]: Object.freeze([
    EyeStatusCode.OK_PROMPT_READY,
    EyeStatusCode.OK_GUIDE,
    EyeStatusCode.OK_WITH_NOTES,
    EyeStatusCode.NEED_CLARIFICATION,
    EyeStatusCode.NEED_MORE_CONTEXT,
    EyeStatusCode.REJECT_INCOMPLETE,
    EyeStatusCode.REJECT_BAD_PLAN,
    EyeStatusCode.EYE_ERROR,
    EyeStatusCode.EYE_TIMEOUT,
    EyeStatusCode.INVALID_ENVELOPE,
  ]),
  [EyeId.JOGAN]: Object.freeze([
    EyeStatusCode.AWAIT_CONFIRMATION,
    EyeStatusCode.NEED_MORE_CONTEXT,
    EyeStatusCode.OK_INTENT_CONFIRMED,
    EyeStatusCode.OK_WITH_NOTES,
    EyeStatusCode.E_INTENT_UNCONFIRMED,
    EyeStatusCode.REJECT_INCONSISTENT,
    EyeStatusCode.EYE_ERROR,
    EyeStatusCode.EYE_TIMEOUT,
    EyeStatusCode.INVALID_ENVELOPE,
  ]),
  [EyeId.RINNEGAN]: Object.freeze([
    EyeStatusCode.OK_PLAN_APPROVED,
    EyeStatusCode.OK_SCHEMA_EMITTED,
    EyeStatusCode.OK_IMPL_APPROVED,
    EyeStatusCode.OK_WITH_NOTES,
    EyeStatusCode.NEED_CLARIFICATION,
    EyeStatusCode.E_PLAN_INCOMPLETE,
    EyeStatusCode.REJECT_BAD_PLAN,
    EyeStatusCode.E_IMPL_ISSUES,
    EyeStatusCode.EYE_ERROR,
    EyeStatusCode.EYE_TIMEOUT,
    EyeStatusCode.INVALID_ENVELOPE,
  ]),
  [EyeId.MANGEKYO]: Object.freeze([
    EyeStatusCode.OK_CODE_APPROVED,
    EyeStatusCode.OK_WITH_NOTES,
    EyeStatusCode.E_CITATIONS_MISSING,
    EyeStatusCode.REJECT_NO_EVIDENCE,
    EyeStatusCode.NEED_CLARIFICATION,
    EyeStatusCode.EYE_ERROR,
    EyeStatusCode.EYE_TIMEOUT,
    EyeStatusCode.INVALID_ENVELOPE,
  ]),
  [EyeId.TENSEIGAN]: Object.freeze([
    EyeStatusCode.OK_TEXT_VALIDATED,
    EyeStatusCode.OK_WITH_NOTES,
    EyeStatusCode.REJECT_INCOMPLETE,
    EyeStatusCode.E_PHASES_INCOMPLETE,
    EyeStatusCode.NEED_CLARIFICATION,
    EyeStatusCode.EYE_ERROR,
    EyeStatusCode.EYE_TIMEOUT,
    EyeStatusCode.INVALID_ENVELOPE,
  ]),
  [EyeId.BYAKUGAN]: Object.freeze([
    EyeStatusCode.OK_ALL_APPROVED,
    EyeStatusCode.OK_CONSISTENT,
    EyeStatusCode.REJECT_INCONSISTENT,
    EyeStatusCode.E_CONTRADICTION_DETECTED,
    EyeStatusCode.REJECT_NO_EVIDENCE,
    EyeStatusCode.NEED_CLARIFICATION,
    EyeStatusCode.EYE_ERROR,
    EyeStatusCode.EYE_TIMEOUT,
    EyeStatusCode.INVALID_ENVELOPE,
  ]),
});

const toReadonlyArray = <T>(items: readonly T[]): readonly T[] =>
  Object.freeze(items.slice());

export const EyeStatusCodeGroup = Object.freeze({
  APPROVED: toReadonlyArray([
    EyeStatusCode.OK,
    EyeStatusCode.OK_WITH_NOTES,
    EyeStatusCode.OK_NO_CLARIFICATION_NEEDED,
    EyeStatusCode.OK_INTENT_CONFIRMED,
    EyeStatusCode.OK_PROMPT_READY,
    EyeStatusCode.OK_GUIDE,
    EyeStatusCode.OK_SCHEMA_EMITTED,
    EyeStatusCode.OK_NEXT_EYE,
    EyeStatusCode.OK_PLAN_APPROVED,
    EyeStatusCode.OK_SCAFFOLD_APPROVED,
    EyeStatusCode.OK_IMPL_APPROVED,
    EyeStatusCode.OK_TESTS_APPROVED,
    EyeStatusCode.OK_DOCS_APPROVED,
    EyeStatusCode.OK_CODE_APPROVED,
    EyeStatusCode.OK_TEXT_VALIDATED,
    EyeStatusCode.OK_CONSISTENT,
    EyeStatusCode.OK_ALL_APPROVED,
  ]),
  NEEDS_INPUT: toReadonlyArray([
    EyeStatusCode.NEED_CLARIFICATION,
    EyeStatusCode.NEED_MORE_CONTEXT,
    EyeStatusCode.SUGGEST_ALTERNATIVE,
    EyeStatusCode.AWAIT_CONFIRMATION,
  ]),
  REVISION: toReadonlyArray([
    EyeStatusCode.REJECT_AMBIGUOUS,
    EyeStatusCode.REJECT_UNSAFE,
    EyeStatusCode.REJECT_INCOMPLETE,
    EyeStatusCode.REJECT_INCONSISTENT,
    EyeStatusCode.REJECT_NO_EVIDENCE,
    EyeStatusCode.REJECT_BAD_PLAN,
    EyeStatusCode.REJECT_CODE_ISSUES,
  ]),
  ERROR: toReadonlyArray([
    EyeStatusCode.E_NEEDS_CLARIFICATION,
    EyeStatusCode.E_INTENT_UNCONFIRMED,
    EyeStatusCode.E_PLAN_INCOMPLETE,
    EyeStatusCode.E_REASONING_MISSING,
    EyeStatusCode.E_SCAFFOLD_ISSUES,
    EyeStatusCode.E_IMPL_ISSUES,
    EyeStatusCode.E_TESTS_INSUFFICIENT,
    EyeStatusCode.E_DOCS_MISSING,
    EyeStatusCode.E_CITATIONS_MISSING,
    EyeStatusCode.E_CONTRADICTION_DETECTED,
    EyeStatusCode.E_PHASES_INCOMPLETE,
    EyeStatusCode.EYE_ERROR,
    EyeStatusCode.EYE_TIMEOUT,
    EyeStatusCode.INVALID_ENVELOPE,
  ]),
});

const createMembershipChecker = <T extends string>(
  group: readonly T[],
): ((code: string) => code is T) => {
  const membership = new Set(group);
  return (code: string): code is T => membership.has(code as T);
};

export const isApprovedEyeStatusCode = createMembershipChecker(
  EyeStatusCodeGroup.APPROVED,
);
export const isNeedsInputEyeStatusCode = createMembershipChecker(
  EyeStatusCodeGroup.NEEDS_INPUT,
);
export const isRevisionEyeStatusCode = createMembershipChecker(
  EyeStatusCodeGroup.REVISION,
);
export const isErrorEyeStatusCode = createMembershipChecker(
  EyeStatusCodeGroup.ERROR,
);

export const RequestType = freezeTokens({
  NEW_TASK: "new_task",
  DRAFT_REVIEW: "draft_review",
  VALIDATION_ONLY: "validation_only",
});

export type RequestType = TokenLiteral<typeof RequestType>;
export const ALL_REQUEST_TYPES = tokenValues(RequestType);

export const ContentDomain = freezeTokens({
  CODE: "code",
  TEXT: "text",
  PLAN: "plan",
  MIXED: "mixed",
});

export type ContentDomain = TokenLiteral<typeof ContentDomain>;
export const ALL_CONTENT_DOMAINS = tokenValues(ContentDomain);

export const NextAction = freezeTokens({
  PROCEED: "PROCEED",
  AWAIT_INPUT: "AWAIT_INPUT",
  AWAIT_DRAFT: "AWAIT_DRAFT",
  AWAIT_CONFIRMATION: "AWAIT_CONFIRMATION",
  COMPLETE: "COMPLETE",
});

export type NextAction = TokenLiteral<typeof NextAction>;
export const ALL_NEXT_ACTIONS = tokenValues(NextAction);

export const UiTextToken = freezeTokens({
  // Next Actions
  PROCEED: "PROCEED",
  AWAIT_INPUT: "AWAIT_INPUT",
  AWAIT_DRAFT: "AWAIT_DRAFT",
  AWAIT_CONFIRMATION: "AWAIT_CONFIRMATION",
  COMPLETE: "COMPLETE",
  // Status Messages
  LOADING: "Loading...",
  NO_DATA: "No data available",
  ERROR: "An error occurred",
  SUCCESS: "Success",
  PENDING: "Pending",
  RUNNING: "Running",
  COMPLETED: "Completed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  // Eye Descriptions
  AMBIGUITY_DETECTION: "Ambiguity detection & clarification",
  REQUIREMENTS_APPROVAL: "Requirements & approval gating",
  CONSISTENCY_CHECK: "Consistency & memory checks",
  EVIDENCE_VALIDATION: "Evidence & citation validation",
  CODE_REVIEW: "Code review across 4 phases",
  AUTO_ROUTING: "Auto-routing & orchestration",
  MASTER_COORDINATOR: "Master coordinator",
  // Wow Features
  EVIDENCE_LENS: "Evidence Lens",
  DUEL_MODE: "Duel Mode",
  REPLAY_THEATER: "Replay Theater",
  KILL_SWITCH: "Kill Switch",
  VISUAL_PLAN: "Visual Plan Renderer",
  LEADERBOARDS: "Leaderboards",
  EXPORT_ENGINE: "Export Engine",
  ADAPTIVE_CLARIFICATIONS: "Adaptive Clarifications",
});

export type UiTextToken = TokenLiteral<typeof UiTextToken>;
export const ALL_UI_TEXT_TOKENS = tokenValues(UiTextToken);

export const UiIconToken = freezeTokens({
  EYE: "eye",
  SHIELD: "shield",
  SEARCH: "search",
  SPARKLES: "sparkles",
  CODE: "code-2",
  GIT_BRANCH: "git-branch",
  CROWN: "crown",
  EYE_OFF: "eye-off",
  CHECK_CIRCLE: "check-circle-2",
  X_CIRCLE: "x-circle",
  ALERT_CIRCLE: "alert-circle",
  LOADER: "loader",
  PLAY_CIRCLE: "play-circle",
  DOWNLOAD: "download",
  UPLOAD: "upload",
  SETTINGS: "settings",
  USERS: "users",
  FOLDER: "folder",
  FILE: "file",
  EDIT: "edit",
  TRASH: "trash",
  PLUS: "plus",
  MINUS: "minus",
  ZAP: "zap",
  SHIELD_ALERT: "shield-alert",
  TROPHY: "trophy",
  FOLDER_TREE: "folder-tree",
  EYE_EXAMINATION: "eye",
});

export type UiIconToken = TokenLiteral<typeof UiIconToken>;
export const ALL_UI_ICON_TOKENS = tokenValues(UiIconToken);

export const UiColorToken = freezeTokens({
  // Brand Colors
  BRAND_PRIMARY: "brand-primary",
  BRAND_ACCENT: "brand-accent",
  BRAND_INK: "brand-ink",
  BRAND_PAPER: "brand-paper",
  BRAND_PAPER_ELEV: "brand-paper-elev",
  BRAND_OUTLINE: "brand-outline",
  // Eye Colors
  EYE_SHARINGAN: "eye-sharingan",
  EYE_PROMPT: "eye-prompt",
  EYE_JOGAN: "eye-jogan",
  EYE_RINNEGAN: "eye-rinnegan",
  EYE_MANGEKYO: "eye-mangekyo",
  EYE_TENSEIGAN: "eye-tenseigan",
  EYE_BYAKUGAN: "eye-byakugan",
  // Semantic Colors
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
  INFO: "info",
  MUTED: "muted",
});

export type UiColorToken = TokenLiteral<typeof UiColorToken>;
export const ALL_UI_COLOR_TOKENS = tokenValues(UiColorToken);
