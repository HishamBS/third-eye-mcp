"""Centralised enums and constant strings for Third Eye Overseer."""
from __future__ import annotations

from enum import Enum
from typing import Final

from .examples import (
    EXAMPLE_BYAKUGAN,
    EXAMPLE_CONTEXT,
    EXAMPLE_DOCS,
    EXAMPLE_FINAL_APPROVAL,
    EXAMPLE_IMPL,
    EXAMPLE_JOGAN,
    EXAMPLE_NAVIGATOR,
    EXAMPLE_PLAN_REQUIREMENTS,
    EXAMPLE_PLAN_REVIEW,
    EXAMPLE_PROMPT_HELPER,
    EXAMPLE_SCAFFOLD,
    EXAMPLE_SHARINGAN,
    EXAMPLE_TENSEIGAN,
    EXAMPLE_TESTS,
)


class Lang(str, Enum):
    AUTO = "auto"
    EN = "en"
    AR = "ar"


class StatusCode(str, Enum):
    OK_OVERSEER_GUIDE = "OK_OVERSEER_GUIDE"
    OK_NO_CLARIFICATION_NEEDED = "OK_NO_CLARIFICATION_NEEDED"
    OK_PROMPT_READY = "OK_PROMPT_READY"
    OK_INTENT_CONFIRMED = "OK_INTENT_CONFIRMED"
    OK_SCHEMA_EMITTED = "OK_SCHEMA_EMITTED"
    OK_PLAN_APPROVED = "OK_PLAN_APPROVED"
    OK_SCAFFOLD_APPROVED = "OK_SCAFFOLD_APPROVED"
    OK_IMPL_APPROVED = "OK_IMPL_APPROVED"
    OK_TESTS_APPROVED = "OK_TESTS_APPROVED"
    OK_DOCS_APPROVED = "OK_DOCS_APPROVED"
    OK_TEXT_VALIDATED = "OK_TEXT_VALIDATED"
    OK_CONSISTENT = "OK_CONSISTENT"
    OK_ALL_APPROVED = "OK_ALL_APPROVED"
    E_NEEDS_CLARIFICATION = "E_NEEDS_CLARIFICATION"
    E_INTENT_UNCONFIRMED = "E_INTENT_UNCONFIRMED"
    E_PLAN_INCOMPLETE = "E_PLAN_INCOMPLETE"
    E_SCAFFOLD_ISSUES = "E_SCAFFOLD_ISSUES"
    E_IMPL_ISSUES = "E_IMPL_ISSUES"
    E_TESTS_INSUFFICIENT = "E_TESTS_INSUFFICIENT"
    E_DOCS_MISSING = "E_DOCS_MISSING"
    E_CITATIONS_MISSING = "E_CITATIONS_MISSING"
    E_UNSUPPORTED_CLAIMS = "E_UNSUPPORTED_CLAIMS"
    E_CONTRADICTION_DETECTED = "E_CONTRADICTION_DETECTED"
    E_REASONING_MISSING = "E_REASONING_MISSING"
    E_PHASES_INCOMPLETE = "E_PHASES_INCOMPLETE"
    E_BAD_PAYLOAD_SCHEMA = "E_BAD_PAYLOAD_SCHEMA"
    E_INTERNAL_ERROR = "E_INTERNAL_ERROR"
    E_BUDGET_EXCEEDED = "E_BUDGET_EXCEEDED"
    E_PROMPT_GUARD = "E_PROMPT_GUARD"


class EyeTag(str, Enum):
    OVERSEER = "[EYE/OVERSEER]"
    SHARINGAN = "[EYE/SHARINGAN]"
    PROMPT_HELPER = "[EYE/PROMPT_HELPER]"
    JOGAN = "[EYE/JOGAN]"
    RINNEGAN_PLAN_REQUIREMENTS = "[EYE/RINNEGAN/PLAN_REQUIREMENTS]"
    RINNEGAN_PLAN_REVIEW = "[EYE/RINNEGAN/PLAN_REVIEW]"
    RINNEGAN_FINAL = "[EYE/RINNEGAN/FINAL]"
    MANGEKYO_REVIEW_SCAFFOLD = "[EYE/MANGEKYO/REVIEW_SCAFFOLD]"
    MANGEKYO_REVIEW_IMPL = "[EYE/MANGEKYO/REVIEW_IMPL]"
    MANGEKYO_REVIEW_TESTS = "[EYE/MANGEKYO/REVIEW_TESTS]"
    MANGEKYO_REVIEW_DOCS = "[EYE/MANGEKYO/REVIEW_DOCS]"
    TENSEIGAN = "[EYE/TENSEIGAN]"
    BYAKUGAN = "[EYE/BYAKUGAN]"


class ToolName(str, Enum):
    OVERSEER_NAVIGATOR = "overseer/navigator"
    SHARINGAN_CLARIFY = "sharingan/clarify"
    PROMPT_HELPER_REWRITE = "helper/rewrite_prompt"
    JOGAN_CONFIRM_INTENT = "jogan/confirm_intent"
    RINNEGAN_PLAN_REQUIREMENTS = "rinnegan/plan_requirements"
    RINNEGAN_PLAN_REVIEW = "rinnegan/plan_review"
    RINNEGAN_FINAL_APPROVAL = "rinnegan/final_approval"
    MANGEKYO_REVIEW_SCAFFOLD = "mangekyo/review_scaffold"
    MANGEKYO_REVIEW_IMPL = "mangekyo/review_impl"
    MANGEKYO_REVIEW_TESTS = "mangekyo/review_tests"
    MANGEKYO_REVIEW_DOCS = "mangekyo/review_docs"
    TENSEIGAN_VALIDATE_CLAIMS = "tenseigan/validate_claims"
    BYAKUGAN_CONSISTENCY_CHECK = "byakugan/consistency_check"


TOOL_BRANCH_MAP: Final[dict[str, str]] = {
    ToolName.OVERSEER_NAVIGATOR.value: "shared",
    ToolName.SHARINGAN_CLARIFY.value: "shared",
    ToolName.PROMPT_HELPER_REWRITE.value: "shared",
    ToolName.JOGAN_CONFIRM_INTENT.value: "shared",
    ToolName.RINNEGAN_PLAN_REQUIREMENTS.value: "code",
    ToolName.RINNEGAN_PLAN_REVIEW.value: "code",
    ToolName.RINNEGAN_FINAL_APPROVAL.value: "code",
    ToolName.MANGEKYO_REVIEW_SCAFFOLD.value: "code",
    ToolName.MANGEKYO_REVIEW_IMPL.value: "code",
    ToolName.MANGEKYO_REVIEW_TESTS.value: "code",
    ToolName.MANGEKYO_REVIEW_DOCS.value: "code",
    ToolName.TENSEIGAN_VALIDATE_CLAIMS.value: "text",
    ToolName.BYAKUGAN_CONSISTENCY_CHECK.value: "text",
}


TOOL_TO_EYE: Final[dict[str, EyeTag]] = {
    ToolName.OVERSEER_NAVIGATOR.value: EyeTag.OVERSEER,
    ToolName.SHARINGAN_CLARIFY.value: EyeTag.SHARINGAN,
    ToolName.PROMPT_HELPER_REWRITE.value: EyeTag.PROMPT_HELPER,
    ToolName.JOGAN_CONFIRM_INTENT.value: EyeTag.JOGAN,
    ToolName.RINNEGAN_PLAN_REQUIREMENTS.value: EyeTag.RINNEGAN_PLAN_REQUIREMENTS,
    ToolName.RINNEGAN_PLAN_REVIEW.value: EyeTag.RINNEGAN_PLAN_REVIEW,
    ToolName.RINNEGAN_FINAL_APPROVAL.value: EyeTag.RINNEGAN_FINAL,
    ToolName.MANGEKYO_REVIEW_SCAFFOLD.value: EyeTag.MANGEKYO_REVIEW_SCAFFOLD,
    ToolName.MANGEKYO_REVIEW_IMPL.value: EyeTag.MANGEKYO_REVIEW_IMPL,
    ToolName.MANGEKYO_REVIEW_TESTS.value: EyeTag.MANGEKYO_REVIEW_TESTS,
    ToolName.MANGEKYO_REVIEW_DOCS.value: EyeTag.MANGEKYO_REVIEW_DOCS,
    ToolName.TENSEIGAN_VALIDATE_CLAIMS.value: EyeTag.TENSEIGAN,
    ToolName.BYAKUGAN_CONSISTENCY_CHECK.value: EyeTag.BYAKUGAN,
}


class PersonaKey(str, Enum):
    SHARINGAN = "sharingan"
    PROMPT_HELPER = "prompt_helper"
    JOGAN = "jogan"
    RINNEGAN = "rinnegan"
    TENSEIGAN = "tenseigan"
    BYAKUGAN = "byakugan"
    MANGEKYO = "mangekyo"


class DataKey(str, Enum):
    SCORE = "score"
    AMBIGUOUS = "ambiguous"
    QUESTIONS_MD = "questions_md"
    POLICY_MD = "policy_md"
    X = "x"
    IS_CODE_RELATED = "is_code_related"
    REASONING_MD = "reasoning_md"
    PROMPT_MD = "prompt_md"
    INSTRUCTIONS_MD = "instructions_md"
    INTENT_CONFIRMED = "intent_confirmed"
    CONFIRMATION_MD = "confirmation_md"
    NEXT_ACTION_MD = "next_action_md"
    EXPECTED_SCHEMA_MD = "expected_schema_md"
    EXAMPLE_MD = "example_md"
    ACCEPTANCE_CRITERIA_MD = "acceptance_criteria_md"
    APPROVED = "approved"
    CHECKLIST_MD = "checklist_md"
    ISSUES_MD = "issues_md"
    FIX_INSTRUCTIONS_MD = "fix_instructions_md"
    COVERAGE_GATE = "coverage_gate"
    CLAIMS_MD = "claims_md"
    CITATIONS_MD = "citations_md"
    CONSISTENT = "consistent"
    ANALYSIS_MD = "analysis_md"
    SUMMARY_MD = "summary_md"
    SCHEMA_MD = "schema_md"
    CONTRACT_JSON = "contract_json"
    BUDGET_TOKENS = "budget_tokens"
    TOOL_VERSION = "tool_version"


class CoverageKey(str, Enum):
    LINES = "lines"
    BRANCHES = "branches"


class Heading(str, Enum):
    OVERSEER_INTRO = "### Overseer Navigator"
    OVERSEER_NEXT_STEPS = "### Next Steps"
    CONTRACT = "### Contract"
    REQUEST_ENVELOPE = "### Request Envelope"
    CLASSIFICATION = "### Classification"
    REASONING = "### Reasoning"
    AMBIGUITY = "### Ambiguity Detected"
    READY = "### Ready"
    CLARIFYING_QUESTIONS = "### Clarifying Questions"
    POLICY = "### Policy"
    PROMPT_READY = "### Prompt Ready"
    OPTIMIZED_PROMPT = "### Optimized Prompt"
    INSTRUCTIONS = "### Instructions to Agent"
    INTENT_NOT_CONFIRMED = "### Intent Not Confirmed"
    INTENT_CONFIRMED = "### Intent Confirmed"
    PLAN_CHECKLIST = "### Plan Review Checklist"
    PLAN_ISSUES = "### Issues"
    PLAN_FIX = "### Fix Instructions"
    PLAN_APPROVED = "### Plan Approved"
    PLAN_REJECTED = "### Plan Rejected"
    PLAN_SCHEMA = "### Plan Schema"
    PLAN_EXAMPLE = "### Example Plan"
    PLAN_ACCEPTANCE = "### Acceptance Criteria"
    CHECKLIST = "### Checklist"
    SCAFFOLD_CHECKLIST = "### Scaffold Checklist"
    SCAFFOLD_APPROVED = "### Scaffold Approved"
    SCAFFOLD_REJECTED = "### Scaffold Rejected"
    IMPLEMENTATION_CHECKLIST = "### Implementation Checklist"
    IMPLEMENTATION_APPROVED = "### Implementation Approved"
    IMPLEMENTATION_REJECTED = "### Implementation Rejected"
    TEST_CHECKLIST = "### Test Checklist"
    DOCUMENTATION_CHECKLIST = "### Documentation Checklist"
    TEST_GATE = "### Tests Approved"
    TESTS_REJECTED = "### Tests Rejected"
    DOCS_APPROVED = "### Documentation Approved"
    DOCS_REJECTED = "### Documentation Rejected"
    REJECTED = "### Rejected"
    CLAIMS = "### Claims"
    CITATIONS = "### Citations"
    CLAIMS_VALIDATED = "### Claims Validated"
    NO_VERIFIABLE_CLAIMS = "### No Verifiable Claims"
    CONSISTENCY = "### Consistency"
    SUMMARY = "### Summary"
    FINAL_APPROVAL = "### Final Approval"
    FINAL_BLOCKED = "### Final Approval Blocked"
    CONFIRMATION = "### Confirmation"
    NEXT_ACTION = "### Next Action"


class NextAction(str, Enum):
    BEGIN_WITH_SHARINGAN = "Start with sharingan/clarify to evaluate ambiguity."
    ASK_CLARIFICATIONS = "Ask these questions to the user and resubmit answers to Prompt Helper."
    SEND_TO_PROMPT_HELPER = "Send answers (or N/A) to Prompt Helper."
    FOLLOW_CODE_BRANCH = "Proceed to helper/rewrite_prompt, then follow the Code branch (Jōgan -> Rinnegan plan -> Mangekyō phases)."
    FOLLOW_TEXT_BRANCH = "Proceed to helper/rewrite_prompt, then follow the Text branch (Jōgan -> Tenseigan -> Byakugan)."
    SEND_TO_JOGAN = "Send to Jōgan for confirmation."
    CALL_PLAN_REQUIREMENTS = "Call Rinnegan/plan_requirements and produce plan per schema."
    RERUN_JOGAN = "Collect user confirmation/edits, then re-run Jōgan."
    SUBMIT_PLAN_REVIEW = "Host agent must submit its plan to rinnegan/plan_review."
    RESUBMIT_PLAN = "Revise plan and resubmit to plan_review."
    GO_TO_MANGEKYO_SCAFFOLD = "Proceed to Mangekyō scaffold review."
    RESUBMIT_SCAFFOLD = "Address issues and resubmit to mangekyo/review_scaffold."
    RESUBMIT_IMPL = "Resolve issues and resubmit to mangekyo/review_impl."
    RESUBMIT_TESTS = "Improve tests and resubmit to mangekyo/review_tests."
    RESUBMIT_DOCS = "Update docs and resubmit to mangekyo/review_docs."
    GO_TO_DOCS = "Proceed to mangekyo/review_docs."
    GO_TO_FINAL = "Proceed to Rinnegan/final_approval when other gates are complete."
    GO_TO_IMPL = "Continue with mangekyo/review_impl."
    GO_TO_TESTS = "Proceed to mangekyo/review_tests."
    ADD_CITATIONS = "Attach sources for each claim and resubmit to tenseigan/validate_claims."
    FIX_CLAIMS = "Attach sources for each claim and resubmit to tenseigan/validate_claims."
    FIX_CONTRADICTIONS = "Resolve contradictions and resubmit."
    COMPLETE_PHASES = "Complete missing phases and resubmit."
    RETURN_DELIVERABLE = "Return the final deliverable to the user (host action)."
    GO_TO_BYAKUGAN = "Proceed to byakugan/consistency_check."
    REWRITE_REQUEST = "Rewrite the request to remove unsafe or meta-instructions, then resubmit."


NEWLINE: Final[str] = "\n"
DOUBLE_NEWLINE: Final[str] = f"{NEWLINE}{NEWLINE}"
BULLET_PREFIX: Final[str] = "- "

PROMPT_INJECTION_PATTERNS: Final[tuple[str, ...]] = (
    "ignore previous instructions",
    "forget the previous",
    "disregard all prior",
    "system prompt",
    "developer prompt",
    "begin_system_prompt",
    "end_system_prompt",
)


class ToolVersion(str, Enum):
    SHARINGAN = "sharingan/clarify@1.0.0"
    PROMPT_HELPER = "helper/rewrite_prompt@1.0.0"
    JOGAN = "jogan/confirm_intent@1.0.0"
    RINNEGAN_PLAN_REQUIREMENTS = "rinnegan/plan_requirements@1.0.0"
    RINNEGAN_PLAN_REVIEW = "rinnegan/plan_review@1.0.0"
    RINNEGAN_FINAL = "rinnegan/final_approval@1.0.0"
    MANGEKYO_SCAFFOLD = "mangekyo/review_scaffold@1.0.0"
    MANGEKYO_IMPL = "mangekyo/review_impl@1.0.0"
    MANGEKYO_TESTS = "mangekyo/review_tests@1.0.0"
    MANGEKYO_DOCS = "mangekyo/review_docs@1.0.0"
    TENSEIGAN = "tenseigan/validate_claims@1.0.0"
    BYAKUGAN = "byakugan/consistency_check@1.0.0"


EYE_TOOL_VERSIONS: dict[EyeTag, str] = {
    EyeTag.SHARINGAN: ToolVersion.SHARINGAN.value,
    EyeTag.PROMPT_HELPER: ToolVersion.PROMPT_HELPER.value,
    EyeTag.JOGAN: ToolVersion.JOGAN.value,
    EyeTag.RINNEGAN_PLAN_REQUIREMENTS: ToolVersion.RINNEGAN_PLAN_REQUIREMENTS.value,
    EyeTag.RINNEGAN_PLAN_REVIEW: ToolVersion.RINNEGAN_PLAN_REVIEW.value,
    EyeTag.RINNEGAN_FINAL: ToolVersion.RINNEGAN_FINAL.value,
    EyeTag.MANGEKYO_REVIEW_SCAFFOLD: ToolVersion.MANGEKYO_SCAFFOLD.value,
    EyeTag.MANGEKYO_REVIEW_IMPL: ToolVersion.MANGEKYO_IMPL.value,
    EyeTag.MANGEKYO_REVIEW_TESTS: ToolVersion.MANGEKYO_TESTS.value,
    EyeTag.MANGEKYO_REVIEW_DOCS: ToolVersion.MANGEKYO_DOCS.value,
    EyeTag.TENSEIGAN: ToolVersion.TENSEIGAN.value,
    EyeTag.BYAKUGAN: ToolVersion.BYAKUGAN.value,
}
CHECKED_BOX: Final[str] = "- [x] "
UNCHECKED_BOX: Final[str] = "- [ ] "
CODE_FENCE_DIFF: Final[str] = "```diff"
EMPTY_MARKDOWN_ENTRY: Final[str] = "- None"
QUESTION_MARK_SYMBOL: Final[str] = "?"
NO_ACTION_NEEDED: Final[str] = "### Fix Instructions\n- No action needed"
SHARINGAN_AMBIGUITY_SUFFIX: Final[str] = "Gather the following clarifications before drafting."
SHARINGAN_READY_SUFFIX: Final[str] = "Prompt is sufficiently specific to continue."
SHARINGAN_POLICY_TEMPLATE: Final[str] = (
    "### Policy\nIf ambiguous=true, the host must ask these questions before drafting. "
    "If is_code_related=true, follow the Code branch: Prompt Helper -> Jōgan -> Rinnegan plan -> Mangekyō phases. "
    "Otherwise follow the Text branch: Prompt Helper -> Jōgan -> Tenseigan -> Byakugan."
)
INVALID_PAYLOAD_HEADING: Final[str] = "### Invalid Payload"
INVALID_PAYLOAD_MESSAGE: Final[str] = "Provide a payload matching the schema. Minimal example:"
REASONING_REQUIRED_HEADING: Final[str] = "### Rejected"
REASONING_REQUIRED_BODY: Final[str] = "`reasoning_md` is required"
BUDGET_EXCEEDED_MESSAGE: Final[str] = (
    "### Budget Exceeded\nAvailable token budget is negative. Increase the budget or split the request."
)
BUDGET_NEXT_ACTION: Final[str] = "Adjust budget_tokens and retry."
INTERNAL_ERROR_HEADING: Final[str] = "### Internal Error"
INTERNAL_ERROR_NEXT: Final[str] = "Review server logs and retry."
NO_CLAIMS_MARKDOWN: Final[str] = "### Claims\n- None"
EMPTY_CITATIONS_TABLE: Final[str] = "### Citations\n| Claim | Source | Confidence |\n|---|---|---|"
CONSISTENCY_DEFAULT_ANALYSIS: Final[str] = "### Consistency\n- Max similarity: 0.82\n- No contradictions found"
SCHEMA_ERROR_NEXT_ACTION: Final[str] = "Re-send the request with a valid payload."
PROMPT_ROLE_LINE: Final[str] = "ROLE: "
PROMPT_TASK_LINE: Final[str] = "TASK: "
PROMPT_ROLE_LABEL: Final[str] = "ROLE:"
PROMPT_TASK_LABEL: Final[str] = "TASK:"
PROMPT_CONTEXT_LABEL: Final[str] = "CONTEXT:"
PROMPT_REQUIREMENTS_LABEL: Final[str] = "REQUIREMENTS:"
PROMPT_OUTPUT_LABEL: Final[str] = "OUTPUT:"
PROMPT_CONTEXT_HEADER: Final[str] = "CONTEXT:"
PROMPT_REQUIREMENTS_HEADER: Final[str] = "REQUIREMENTS:"
PROMPT_OUTPUT_HEADER: Final[str] = "OUTPUT:"
PROMPT_REQUIREMENT_FOLLOW_GATES: Final[str] = "- Follow Overseer gate decisions"
PROMPT_REQUIREMENT_CITE: Final[str] = "- Cite all factual claims with sources"
PROMPT_REQUIREMENT_REASONING: Final[str] = "- Document assumptions in reasoning_md"
PROMPT_OUTPUT_DIRECTIVE: Final[str] = "- Provide only the deliverable requested by the user"
INSTRUCTION_USE_PROMPT: Final[str] = "- Use the optimized prompt verbatim when generating the deliverable."
INSTRUCTION_INCLUDE_REASONING: Final[str] = "- Include reasoning_md alongside any work product for auditability."
INSTRUCTION_PAUSE_FOR_AMBIGUITY: Final[str] = "- Pause and request clarification if new ambiguities appear."
NEXT_ACTION_PROCEED_RINNEGAN: Final[str] = "### Next Action\nProceed to Rinnegan planning phase."
NEXT_ACTION_ADJUST_PROMPT: Final[str] = "### Next Action\nAdjust the prompt to include missing sections or reduce scope."
CHECKBOX_TEMPLATE: Final[str] = "- [{mark}] {label}"
ISSUE_BULLET_TEMPLATE: Final[str] = "- {item}"
SUMMARY_BULLET_TEMPLATE: Final[str] = "- {label} {status}"
UNKNOWN_STATUS_TEMPLATE: Final[str] = "Unknown status code: {code}"
POLICY_BULLET_GATHER: Final[str] = "- Host must gather all clarifications before drafting."
POLICY_BULLET_NUMBERED: Final[str] = "- Provide concise answers numbered 1..{total}."
POLICY_BULLET_NA: Final[str] = "- If the user cannot answer, set N/A and explain follow-up plan."
SCHEMA_TABLE_HEADER: Final[str] = "| Path | Action | Reason |"
SCHEMA_TABLE_DIVIDER: Final[str] = "|---|---|---|"
DOCS_REFERENCE_KEYWORDS: Final[tuple[str, ...]] = ("readme", "docs")
CONSISTENCY_FORBIDDEN_TOKENS: Final[tuple[str, ...]] = ("todo", "tbd")
AMBIGUITY_VAGUE_WORDS: Final[tuple[str, ...]] = ("some", "stuff", "thing", "things", "various")
AMBIGUITY_UNSPECIFIED_WORDS: Final[tuple[str, ...]] = ("asap", "urgent", "improve", "better", "nice", "quickly")
AMBIGUITY_VERB_PATTERN: Final[str] = r"^[a-zA-Z]+ing$"
TOKEN_ESTIMATE_LIMIT_LABEL: Final[str] = "Estimated tokens within agreed limit"
AMBIGUITY_LENGTH_THRESHOLD: Final[int] = 40
AMBIGUITY_SCORE_THRESHOLD: Final[float] = 0.35
CLARIFICATION_MULTIPLIER: Final[int] = 5
CLARIFICATION_MIN_COUNT: Final[int] = 2
CLARIFICATION_MAX_COUNT: Final[int] = 6
EXAMPLE_SESSION_ID: Final[str] = EXAMPLE_CONTEXT["session_id"]
EXAMPLE_USER_ID: Final[str] = EXAMPLE_CONTEXT["user_id"]  # type: ignore[index]
EXAMPLE_PROMPT = EXAMPLE_SHARINGAN["payload"]["prompt"]
EXAMPLE_LANG_EN = EXAMPLE_CONTEXT["lang"]

CLARIFYING_QUESTION_BANK: Final[tuple[str, ...]] = (
    "What outcome should the host deliver?",
    "Who is the target audience and their expertise level?",
    "What constraints (tone, tools, scope) must be honored?",
    "Are there mandatory sources or datasets to consult?",
    "What does success look like for the requester?",
    "Are there sections or deliverables that must be avoided?",
)

SHARINGAN_CODE_ACTION_KEYWORDS: Final[tuple[str, ...]] = (
    "write",
    "modify",
    "refactor",
    "review",
    "fix",
    "bug",
    "feature",
    "optimize",
    "improve",
    "diff",
    "patch",
    "change",
    "tests",
    "test",
    "docs",
    "documentation",
)

SHARINGAN_STRONG_CODE_ACTION_KEYWORDS: Final[tuple[str, ...]] = (
    "modify",
    "refactor",
    "fix",
    "bug",
    "feature",
    "optimize",
    "improve",
    "diff",
    "patch",
    "change",
    "tests",
    "test",
    "docs",
    "documentation",
)

SHARINGAN_CODE_TOOLING_KEYWORDS: Final[tuple[str, ...]] = (
    "repo",
    "pr",
    "pull request",
    "commit",
    "branch",
    "ci",
    "cd",
    "lint",
    "build",
    "pipeline",
)

SHARINGAN_CODE_ARTIFACT_KEYWORDS: Final[tuple[str, ...]] = (
    "function",
    "class",
    "module",
    "package",
    "api",
    "endpoint",
    "schema",
    "migration",
    "dockerfile",
)

SHARINGAN_CODE_EXTENSIONS: Final[tuple[str, ...]] = (
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".java",
    ".rb",
    ".go",
    ".rs",
    ".cpp",
    ".c",
    ".h",
    ".css",
    ".scss",
    ".html",
    ".md",
    ".sql",
    ".yaml",
    ".yml",
    ".toml",
    ".json",
)

SHARINGAN_CODE_TECH_KEYWORDS: Final[tuple[str, ...]] = (
    "react",
    "next.js",
    "vue",
    "svelte",
    "angular",
    "django",
    "flask",
    "fastapi",
    "spring",
    "rails",
    "laravel",
    "node",
    "express",
    "nest",
    "prisma",
    "sequelize",
    "typeorm",
    "sqlalchemy",
    "redis",
    "kafka",
    "rabbitmq",
    "postgresql",
    "mysql",
    "mongodb",
    "elasticsearch",
    "docker",
    "kubernetes",
    "terraform",
    "aws",
    "gcp",
    "azure",
    "vite",
    "webpack",
    "babel",
    "jest",
    "vitest",
    "pytest",
    "playwright",
    "cypress",
)

SHARINGAN_CODE_FENCE_PREFIXES: Final[tuple[str, ...]] = (
    "```",
)

SCHEMA_SECTION_LABELS: Final[tuple[str, ...]] = (
    "High-Level Overview",
    "File Impact Table",
    "Step-by-step Implementation Plan",
    "Error Handling & Edge Cases",
    "Test Strategy",
    "Rollback Plan",
    "Documentation Updates",
)

REVIEW_DOCS_REFERENCE_HINT: Final[str] = "Reference the documentation files updated (e.g., README, docs/...)."
DOCS_MENTION_KEYWORDS: Final[tuple[str, ...]] = ("README", "docs")

CONSISTENCY_CONTRADICTION_PATTERNS: Final[tuple[tuple[str, str], ...]] = (
    (r"\bno\s+change\b", r"\b(grew|increased|declined|decreased)\b"),
    (r"\bnever\b", r"\bpreviously\b"),
)
CLAIMS_TABLE_HEADER: Final[str] = "| Claim | Source | Confidence |"
CLAIMS_TABLE_DIVIDER: Final[str] = "|---|---|---|"
CLAIMS_ROW_TEMPLATE: Final[str] = "| {claim} | {source} | {confidence:.2f} |"
IMPLEMENTATION_FORBIDDEN_TOKENS: Final[tuple[str, ...]] = ("TODO", "FIXME")
COVERAGE_REGEX_PATTERN: Final[str] = r"(lines|branches)\s*:\s*(\d+)%"

REASONING_DETAILS_PLAN: Final[str] = "(capture rationale, trade-offs, and open questions)."
REASONING_DETAILS_SCAFFOLD: Final[str] = "(explain file coverage, sequencing, and risks)."
REASONING_DETAILS_IMPL: Final[str] = "(design choices, trade-offs, risks)."
REASONING_DETAILS_TESTS: Final[str] = "(outline coverage strategy and risk mitigation)."
REASONING_DETAILS_DOCS: Final[str] = "(call out updated sections and communication)."
REASONING_DETAILS_EVIDENCE: Final[str] = "(describe evidence searches and verification heuristics)."
REASONING_DETAILS_CONSISTENCY: Final[str] = "(reference comparison sources and rationale)."
REASONING_NEXT_PLAN = "Resubmit to rinnegan/plan_review with reasoning_md."
REASONING_NEXT_SCAFFOLD = "Resubmit to mangekyo/review_scaffold with reasoning_md."
REASONING_NEXT_IMPL = "Resubmit to mangekyo/review_impl with reasoning_md."
REASONING_NEXT_TESTS = "Resubmit to mangekyo/review_tests with reasoning_md."
REASONING_NEXT_DOCS = "Resubmit to mangekyo/review_docs with reasoning_md."
REASONING_NEXT_EVIDENCE = "Resubmit to tenseigan/validate_claims with reasoning_md."
REASONING_NEXT_CONSISTENCY = "Resubmit to byakugan/consistency_check with reasoning_md."

__all__ = [
    "Lang",
    "StatusCode",
    "EyeTag",
    "Heading",
    "NextAction",
    "DataKey",
    "CoverageKey",
    "PersonaKey",
    "ToolName",
    "NEWLINE",
    "DOUBLE_NEWLINE",
    "BULLET_PREFIX",
    "CHECKED_BOX",
    "UNCHECKED_BOX",
    "CODE_FENCE_DIFF",
    "EMPTY_MARKDOWN_ENTRY",
    "QUESTION_MARK_SYMBOL",
    "NO_ACTION_NEEDED",
    "SHARINGAN_AMBIGUITY_SUFFIX",
    "SHARINGAN_READY_SUFFIX",
    "SHARINGAN_POLICY_TEMPLATE",
    "INVALID_PAYLOAD_HEADING",
    "INVALID_PAYLOAD_MESSAGE",
    "REASONING_REQUIRED_HEADING",
    "REASONING_REQUIRED_BODY",
    "BUDGET_EXCEEDED_MESSAGE",
    "BUDGET_NEXT_ACTION",
    "INTERNAL_ERROR_HEADING",
    "INTERNAL_ERROR_NEXT",
    "NO_CLAIMS_MARKDOWN",
    "EMPTY_CITATIONS_TABLE",
    "CONSISTENCY_DEFAULT_ANALYSIS",
    "SCHEMA_ERROR_NEXT_ACTION",
    "PROMPT_ROLE_LINE",
    "PROMPT_TASK_LINE",
    "PROMPT_ROLE_LABEL",
    "PROMPT_TASK_LABEL",
    "PROMPT_CONTEXT_LABEL",
    "PROMPT_REQUIREMENTS_LABEL",
    "PROMPT_OUTPUT_LABEL",
    "PROMPT_CONTEXT_HEADER",
    "PROMPT_REQUIREMENTS_HEADER",
    "PROMPT_OUTPUT_HEADER",
    "PROMPT_REQUIREMENT_FOLLOW_GATES",
    "PROMPT_REQUIREMENT_CITE",
    "PROMPT_REQUIREMENT_REASONING",
    "PROMPT_OUTPUT_DIRECTIVE",
    "INSTRUCTION_USE_PROMPT",
    "INSTRUCTION_INCLUDE_REASONING",
    "INSTRUCTION_PAUSE_FOR_AMBIGUITY",
    "NEXT_ACTION_PROCEED_RINNEGAN",
    "NEXT_ACTION_ADJUST_PROMPT",
    "CHECKBOX_TEMPLATE",
    "ISSUE_BULLET_TEMPLATE",
    "SUMMARY_BULLET_TEMPLATE",
    "UNKNOWN_STATUS_TEMPLATE",
    "POLICY_BULLET_GATHER",
    "POLICY_BULLET_NUMBERED",
    "POLICY_BULLET_NA",
    "SCHEMA_TABLE_HEADER",
    "SCHEMA_TABLE_DIVIDER",
    "DOCS_REFERENCE_KEYWORDS",
    "CONSISTENCY_FORBIDDEN_TOKENS",
    "AMBIGUITY_VAGUE_WORDS",
    "AMBIGUITY_UNSPECIFIED_WORDS",
    "AMBIGUITY_VERB_PATTERN",
    "TOKEN_ESTIMATE_LIMIT_LABEL",
    "AMBIGUITY_LENGTH_THRESHOLD",
    "AMBIGUITY_SCORE_THRESHOLD",
    "CLARIFICATION_MULTIPLIER",
    "CLARIFICATION_MIN_COUNT",
    "CLARIFICATION_MAX_COUNT",
    "EXAMPLE_SESSION_ID",
    "EXAMPLE_USER_ID",
    "EXAMPLE_PROMPT",
    "EXAMPLE_LANG_EN",
    "CLARIFYING_QUESTION_BANK",
    "SHARINGAN_CODE_ACTION_KEYWORDS",
    "SHARINGAN_STRONG_CODE_ACTION_KEYWORDS",
    "SHARINGAN_CODE_TOOLING_KEYWORDS",
    "SHARINGAN_CODE_ARTIFACT_KEYWORDS",
    "SHARINGAN_CODE_EXTENSIONS",
    "SHARINGAN_CODE_TECH_KEYWORDS",
    "SHARINGAN_CODE_FENCE_PREFIXES",
    "SCHEMA_SECTION_LABELS",
    "REVIEW_DOCS_REFERENCE_HINT",
    "DOCS_MENTION_KEYWORDS",
    "CONSISTENCY_CONTRADICTION_PATTERNS",
    "CLAIMS_TABLE_HEADER",
    "CLAIMS_TABLE_DIVIDER",
    "CLAIMS_ROW_TEMPLATE",
    "IMPLEMENTATION_FORBIDDEN_TOKENS",
    "COVERAGE_REGEX_PATTERN",
    "REASONING_DETAILS_PLAN",
    "REASONING_DETAILS_SCAFFOLD",
    "REASONING_DETAILS_IMPL",
    "REASONING_DETAILS_TESTS",
    "REASONING_DETAILS_DOCS",
    "REASONING_DETAILS_EVIDENCE",
    "REASONING_DETAILS_CONSISTENCY",
    "REASONING_NEXT_PLAN",
    "REASONING_NEXT_SCAFFOLD",
    "REASONING_NEXT_IMPL",
    "REASONING_NEXT_TESTS",
    "REASONING_NEXT_DOCS",
    "REASONING_NEXT_EVIDENCE",
    "REASONING_NEXT_CONSISTENCY",
]
