export const AMBIGUITY_SCORE_THRESHOLD = 0.50;
export const AMBIGUITY_LENGTH_THRESHOLD = 25;
export const CLARIFICATION_MIN_COUNT = 3;
export const CLARIFICATION_MAX_COUNT = 10;
export const CLARIFICATION_MULTIPLIER = 10;

export const AMBIGUITY_VAGUE_WORDS = new Set([
  "some", "few", "many", "several", "various", "certain", "stuff", "things",
  "something", "anything", "everything", "better", "worse", "good", "bad",
  "nice", "okay", "fine", "maybe", "probably", "possibly", "perhaps",
  "somehow", "somewhat", "kind of", "sort of", "a bit", "a little"
]);

export const AMBIGUITY_UNSPECIFIED_WORDS = new Set([
  "it", "this", "that", "these", "those", "them", "they", "etc", "etcetera"
]);

export const SHARINGAN_CODE_ACTION_KEYWORDS = [
  "write", "create", "build", "implement", "add", "update", "fix", "refactor",
  "optimize", "generate", "scaffold", "setup", "install", "deploy", "test",
  "debug", "review", "analyze", "migrate", "convert", "transform"
];

export const SHARINGAN_STRONG_CODE_ACTION_KEYWORDS = new Set([
  "write", "create", "build", "implement", "refactor", "scaffold"
]);

export const SHARINGAN_CODE_TOOLING_KEYWORDS = [
  "npm", "yarn", "pnpm", "bun", "git", "docker", "kubernetes", "webpack",
  "vite", "rollup", "babel", "eslint", "prettier", "jest", "vitest",
  "cypress", "playwright", "github", "gitlab", "ci/cd", "jenkins"
];

export const SHARINGAN_CODE_ARTIFACT_KEYWORDS = [
  "function", "class", "component", "module", "package", "library", "api",
  "endpoint", "route", "middleware", "hook", "util", "helper", "service",
  "controller", "model", "view", "schema", "interface", "type", "enum"
];

export const SHARINGAN_CODE_TECH_KEYWORDS = [
  "javascript", "typescript", "python", "java", "rust", "go", "c++", "c#",
  "react", "vue", "angular", "svelte", "next.js", "nuxt", "express", "fastify",
  "hono", "django", "flask", "spring", "node.js", "deno", "bun"
];

export const SHARINGAN_CODE_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".rs", ".go", ".cpp", ".cs",
  ".html", ".css", ".scss", ".json", ".yaml", ".toml", ".md", ".sh"
];

export const SHARINGAN_CODE_FENCE_PREFIXES = ["```", "~~~"];

export const CLARIFYING_QUESTION_BANK = [
  "What is the primary goal or outcome you expect?",
  "Are there any constraints or requirements I should know about?",
  "Who is the target audience or user?",
  "What format should the deliverable take?",
  "Are there any examples or references I should follow?",
  "What level of detail is appropriate?",
  "Should I prioritize speed, quality, or maintainability?",
  "Are there any technologies or frameworks you prefer?",
  "What is the timeline or deadline for this task?",
  "Are there any existing systems or code I need to integrate with?"
];

export const CONSISTENCY_CONTRADICTION_PATTERNS: Array<[RegExp, RegExp]> = [
  [/\balways\b/, /\bnever\b/],
  [/\ball\b/, /\bnone\b/],
  [/\beveryone\b/, /\bno one\b/],
  [/\bincreased\b/, /\bdecreased\b/],
  [/\bgrew\b/, /\bshrank\b/],
  [/\bpossible\b/, /\bimpossible\b/]
];

export const SCHEMA_SECTION_LABELS = [
  "High-Level Overview",
  "File Impact Table",
  "Step-by-step Implementation Plan",
  "Error Handling & Edge Cases",
  "Test Strategy",
  "Rollback Plan",
  "Documentation Updates"
];

export const SCHEMA_TABLE_HEADER = "| Path | Action | Reason |";
export const SCHEMA_TABLE_DIVIDER = "|---|---|---|";
export const CHECKBOX_TEMPLATE = "- [{mark}] {label}";
export const ISSUE_BULLET_TEMPLATE = "- {item}";
export const SUMMARY_BULLET_TEMPLATE = "- {label}: {status}";
export const NO_ACTION_NEEDED = "### Fix Instructions\n- No action needed";

export enum EyeTag {
  OVERSEER = "overseer",
  SHARINGAN = "sharingan",
  PROMPT_HELPER = "helper",
  JOGAN = "jogan",
  RINNEGAN = "rinnegan",
  MANGEKYO = "mangekyo",
  TENSEIGAN = "tenseigan",
  BYAKUGAN = "byakugan"
}

export enum StatusCode {
  OK_NO_CLARIFICATION_NEEDED = "OK_NO_CLARIFICATION_NEEDED",
  OK_INTENT_CONFIRMED = "OK_INTENT_CONFIRMED",
  OK_PROMPT_READY = "OK_PROMPT_READY",
  OK_SCHEMA_EMITTED = "OK_SCHEMA_EMITTED",
  OK_PLAN_APPROVED = "OK_PLAN_APPROVED",
  OK_SCAFFOLD_APPROVED = "OK_SCAFFOLD_APPROVED",
  OK_IMPL_APPROVED = "OK_IMPL_APPROVED",
  OK_TESTS_APPROVED = "OK_TESTS_APPROVED",
  OK_DOCS_APPROVED = "OK_DOCS_APPROVED",
  OK_CODE_APPROVED = "OK_CODE_APPROVED",
  OK_TEXT_VALIDATED = "OK_TEXT_VALIDATED",
  OK_CONSISTENT = "OK_CONSISTENT",
  OK_ALL_APPROVED = "OK_ALL_APPROVED",

  E_NEEDS_CLARIFICATION = "E_NEEDS_CLARIFICATION",
  E_INTENT_UNCONFIRMED = "E_INTENT_UNCONFIRMED",
  E_PLAN_INCOMPLETE = "E_PLAN_INCOMPLETE",
  E_REASONING_MISSING = "E_REASONING_MISSING",
  E_SCAFFOLD_ISSUES = "E_SCAFFOLD_ISSUES",
  E_IMPL_ISSUES = "E_IMPL_ISSUES",
  E_TESTS_INSUFFICIENT = "E_TESTS_INSUFFICIENT",
  E_DOCS_MISSING = "E_DOCS_MISSING",
  E_CITATIONS_MISSING = "E_CITATIONS_MISSING",
  E_CONTRADICTION_DETECTED = "E_CONTRADICTION_DETECTED",
  E_PHASES_INCOMPLETE = "E_PHASES_INCOMPLETE"
}

export enum NextAction {
  ASK_CLARIFICATIONS = "ASK_CLARIFICATIONS",
  FOLLOW_CODE_BRANCH = "FOLLOW_CODE_BRANCH",
  FOLLOW_TEXT_BRANCH = "FOLLOW_TEXT_BRANCH",
  SEND_TO_JOGAN = "SEND_TO_JOGAN",
  RERUN_JOGAN = "RERUN_JOGAN",
  CALL_PLAN_REQUIREMENTS = "CALL_PLAN_REQUIREMENTS",
  SUBMIT_PLAN_REVIEW = "SUBMIT_PLAN_REVIEW",
  RESUBMIT_PLAN = "RESUBMIT_PLAN",
  GO_TO_MANGEKYO_SCAFFOLD = "GO_TO_MANGEKYO_SCAFFOLD",
  RESUBMIT_SCAFFOLD = "RESUBMIT_SCAFFOLD",
  GO_TO_IMPL = "GO_TO_IMPL",
  RESUBMIT_IMPL = "RESUBMIT_IMPL",
  GO_TO_TESTS = "GO_TO_TESTS",
  RESUBMIT_TESTS = "RESUBMIT_TESTS",
  GO_TO_DOCS = "GO_TO_DOCS",
  RESUBMIT_DOCS = "RESUBMIT_DOCS",
  GO_TO_FINAL = "GO_TO_FINAL",
  ADD_CITATIONS = "ADD_CITATIONS",
  FIX_CONTRADICTIONS = "FIX_CONTRADICTIONS",
  GO_TO_BYAKUGAN = "GO_TO_BYAKUGAN",
  COMPLETE_PHASES = "COMPLETE_PHASES",
  RETURN_DELIVERABLE = "RETURN_DELIVERABLE"
}

export enum Heading {
  REASONING = "### Reasoning",
  AMBIGUITY = "### Ambiguity Detected",
  CLASSIFICATION = "### Classification",
  CLARIFYING_QUESTIONS = "### Clarifying Questions",
  INTENT_CONFIRMED = "### Intent Confirmed",
  INTENT_NOT_CONFIRMED = "### Intent Not Confirmed",
  PROMPT_READY = "### Prompt Ready",
  NEXT_ACTION = "### Next Action",
  PLAN_SCHEMA = "### Plan Schema",
  PLAN_CHECKLIST = "### Plan Checklist",
  PLAN_APPROVED = "### Plan Approved",
  PLAN_REJECTED = "### Plan Rejected",
  PLAN_ISSUES = "### Plan Issues",
  PLAN_FIX = "### Fix Instructions",
  SUMMARY = "### Summary",
  FINAL_BLOCKED = "### Final Approval Blocked",
  FINAL_APPROVAL = "### Final Approval",
  SCAFFOLD_CHECKLIST = "### Scaffold Checklist",
  SCAFFOLD_APPROVED = "### Scaffold Approved",
  SCAFFOLD_REJECTED = "### Scaffold Rejected",
  IMPLEMENTATION_CHECKLIST = "### Implementation Checklist",
  IMPLEMENTATION_APPROVED = "### Implementation Approved",
  IMPLEMENTATION_REJECTED = "### Implementation Rejected",
  TEST_CHECKLIST = "### Test Checklist",
  TEST_GATE = "### Test Gate",
  TESTS_REJECTED = "### Tests Rejected",
  DOCUMENTATION_CHECKLIST = "### Documentation Checklist",
  DOCS_APPROVED = "### Documentation Approved",
  DOCS_REJECTED = "### Documentation Rejected",
  CONSISTENCY = "### Consistency Check",
  CITATIONS = "### Citations",
  CLAIMS_VALIDATED = "### Claims Validated"
}

export enum DataKey {
  SCORE = "score",
  AMBIGUOUS = "ambiguous",
  X = "x",
  IS_CODE_RELATED = "is_code_related",
  REASONING_MD = "reasoning_md",
  QUESTIONS_MD = "questions_md",
  POLICY_MD = "policy_md",
  INTENT_CONFIRMED = "intent_confirmed",
  ISSUES_MD = "issues_md",
  PROMPT_MD = "prompt_md",
  NEXT_ACTION_MD = "next_action_md",
  EXPECTED_SCHEMA_MD = "expected_schema_md",
  EXAMPLE_MD = "example_md",
  ACCEPTANCE_CRITERIA_MD = "acceptance_criteria_md",
  APPROVED = "approved",
  CHECKLIST_MD = "checklist_md",
  FIX_INSTRUCTIONS_MD = "fix_instructions_md",
  SUMMARY_MD = "summary_md",
  CLAIMS_MD = "claims_md"
}

export const SHARINGAN_AMBIGUITY_SUFFIX = "The prompt is too vague. Please answer the clarifying questions above.";
export const SHARINGAN_POLICY_TEMPLATE = "### Policy\nAlways clarify ambiguous prompts before proceeding with implementation.";

// Re-export BaseEnvelope as EyeResponse for backward compatibility
export type { BaseEnvelope as EyeResponse } from './src/schemas/base';
