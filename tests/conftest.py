import os
import re
from collections import Counter
from typing import Any, Dict, List

import pytest

os.environ.setdefault("GROQ_API_KEY", "test-key")
os.environ.setdefault("REDIS_URL", "redis://:test-password@localhost:6379/0")
os.environ.setdefault("THIRD_EYE_SECRET_KEY", "MTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTE=")

from third_eye.constants import (
    BULLET_PREFIX,
    CHECKBOX_TEMPLATE,
    CLAIMS_TABLE_DIVIDER,
    CLAIMS_TABLE_HEADER,
    CODE_FENCE_DIFF,
    CONSISTENCY_CONTRADICTION_PATTERNS,
    CONSISTENCY_DEFAULT_ANALYSIS,
    CONSISTENCY_FORBIDDEN_TOKENS,
    COVERAGE_REGEX_PATTERN,
    DataKey,
    DOCS_REFERENCE_KEYWORDS,
    EMPTY_CITATIONS_TABLE,
    Heading,
    IMPLEMENTATION_FORBIDDEN_TOKENS,
    INSTRUCTION_INCLUDE_REASONING,
    INSTRUCTION_PAUSE_FOR_AMBIGUITY,
    INSTRUCTION_USE_PROMPT,
    ISSUE_BULLET_TEMPLATE,
    NEWLINE,
    NEXT_ACTION_ADJUST_PROMPT,
    NEXT_ACTION_PROCEED_RINNEGAN,
    NextAction,
    NO_ACTION_NEEDED,
    NO_CLAIMS_MARKDOWN,
    POLICY_BULLET_GATHER,
    POLICY_BULLET_NA,
    POLICY_BULLET_NUMBERED,
    PROMPT_CONTEXT_HEADER,
    PROMPT_CONTEXT_LABEL,
    PROMPT_OUTPUT_DIRECTIVE,
    PROMPT_OUTPUT_HEADER,
    PROMPT_OUTPUT_LABEL,
    PROMPT_REQUIREMENT_CITE,
    PROMPT_REQUIREMENT_FOLLOW_GATES,
    PROMPT_REQUIREMENT_REASONING,
    PROMPT_REQUIREMENTS_HEADER,
    PROMPT_REQUIREMENTS_LABEL,
    PROMPT_ROLE_LABEL,
    PROMPT_ROLE_LINE,
    PROMPT_TASK_LABEL,
    PROMPT_TASK_LINE,
    SCHEMA_SECTION_LABELS,
    SCHEMA_TABLE_DIVIDER,
    SCHEMA_TABLE_HEADER,
    SHARINGAN_POLICY_TEMPLATE,
    StatusCode,
    SUMMARY_BULLET_TEMPLATE,
    TOKEN_ESTIMATE_LIMIT_LABEL,
    ToolName,
)
from third_eye.eyes import sharingan as sharingan_eye


@pytest.fixture()
def base_context() -> Dict[str, object]:
    return {
        "session_id": "sess-test",
        "user_id": "user-test",
        "tenant": "cli",
        "lang": "en",
        "budget_tokens": 0,
        "request_id": None,
    }
def _sharingan_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    prompt = payload["payload"]["prompt"].strip()
    score, ambiguous, x = sharingan_eye._ambiguity_score(prompt)
    is_code_related, code_features = sharingan_eye._detect_code_features(prompt)
    questions_md = sharingan_eye._build_questions_md(x)
    reasoning_md = sharingan_eye._build_reasoning_md(
        score=score,
        ambiguous=ambiguous,
        is_code_related=is_code_related,
        code_features=code_features,
    )
    md = sharingan_eye._summary_md(ambiguous=ambiguous, is_code_related=is_code_related)
    next_action = sharingan_eye._next_action(
        ambiguous=ambiguous, is_code_related=is_code_related
    )
    code = sharingan_eye._status_code(ambiguous)
    policy_md = SHARINGAN_POLICY_TEMPLATE
    return {
        "ok": not ambiguous,
        "code": code.value,
        "md": md,
        "data": {
            DataKey.SCORE.value: score,
            DataKey.AMBIGUOUS.value: ambiguous,
            DataKey.X.value: x,
            DataKey.IS_CODE_RELATED.value: is_code_related,
            DataKey.REASONING_MD.value: reasoning_md,
            DataKey.QUESTIONS_MD.value: questions_md,
            DataKey.POLICY_MD.value: policy_md,
        },
        "next": next_action,
    }

def _prompt_helper_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    prompt = payload["payload"]["user_prompt"].strip()
    clar_md = payload["payload"]["clarification_answers_md"].strip()
    lines = [line.strip() for line in clar_md.splitlines() if line.strip() and not line.startswith(Heading.POLICY.value)]
    context_entries = [f"{BULLET_PREFIX}{line}" for line in lines]
    context_block = NEWLINE.join([PROMPT_CONTEXT_HEADER, *context_entries]) if context_entries else PROMPT_CONTEXT_HEADER
    requirements_block = NEWLINE.join(
        [
            PROMPT_REQUIREMENTS_HEADER,
            PROMPT_REQUIREMENT_FOLLOW_GATES,
            PROMPT_REQUIREMENT_CITE,
            PROMPT_REQUIREMENT_REASONING,
        ]
    )
    output_block = NEWLINE.join([PROMPT_OUTPUT_HEADER, PROMPT_OUTPUT_DIRECTIVE])
    prompt_md = NEWLINE.join(
        [
            Heading.OPTIMIZED_PROMPT.value,
            f"{PROMPT_ROLE_LINE}Prompt Helper",
            f"{PROMPT_TASK_LINE}{prompt}",
            context_block,
            requirements_block,
            output_block,
        ]
    )
    instructions_md = NEWLINE.join(
        [
            Heading.INSTRUCTIONS.value,
            INSTRUCTION_USE_PROMPT,
            INSTRUCTION_INCLUDE_REASONING,
            INSTRUCTION_PAUSE_FOR_AMBIGUITY,
        ]
    )
    return {
        "ok": True,
        "code": StatusCode.OK_PROMPT_READY.value,
        "md": f"{Heading.PROMPT_READY.value}{NEWLINE}Prompt engineered for downstream agent.",
        "data": {
            DataKey.PROMPT_MD.value: prompt_md,
            DataKey.INSTRUCTIONS_MD.value: instructions_md,
        },
        "next": NextAction.SEND_TO_JOGAN.value,
    }

def _jogan_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    refined_prompt = payload["payload"]["refined_prompt_md"]
    estimated_tokens = payload["payload"].get("estimated_tokens", 0)
    required_sections = (
        PROMPT_ROLE_LABEL,
        PROMPT_TASK_LABEL,
        PROMPT_CONTEXT_LABEL,
        PROMPT_REQUIREMENTS_LABEL,
        PROMPT_OUTPUT_LABEL,
    )
    missing = [section for section in required_sections if section not in refined_prompt]
    over_budget = estimated_tokens > 2000
    checklist_lines = [Heading.PLAN_CHECKLIST.value]
    for section in required_sections:
        mark = "x" if section not in missing else " "
        checklist_lines.append(CHECKBOX_TEMPLATE.format(mark=mark, label=f"{section.rstrip(':')} section present"))
    checklist_lines.append(CHECKBOX_TEMPLATE.format(mark="x" if not over_budget else " ", label=TOKEN_ESTIMATE_LIMIT_LABEL))
    checklist_md = NEWLINE.join(checklist_lines)
    if missing or over_budget:
        issues = []
        if missing:
            issues.append(f"Missing sections: {', '.join(missing)}")
        if over_budget:
            issues.append(f"Estimated tokens {estimated_tokens} exceeds limit 2000.")
        issues_md = f"{Heading.PLAN_ISSUES.value}{NEWLINE}" + NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in issues)
        return {
            "ok": False,
            "code": StatusCode.E_INTENT_UNCONFIRMED.value,
            "md": f"{Heading.INTENT_NOT_CONFIRMED.value}{NEWLINE}" + NEWLINE.join(issues),
            "data": {
                DataKey.INTENT_CONFIRMED.value: False,
                DataKey.CONFIRMATION_MD.value: checklist_md,
                DataKey.NEXT_ACTION_MD.value: NEXT_ACTION_ADJUST_PROMPT,
            },
            "next": NextAction.RERUN_JOGAN.value,
        }
    task_line = next((line for line in refined_prompt.splitlines() if PROMPT_TASK_LABEL in line), PROMPT_TASK_LABEL)
    normalized_task = task_line.split(PROMPT_TASK_LABEL, 1)[-1].strip()
    return {
        "ok": True,
        "code": StatusCode.OK_INTENT_CONFIRMED.value,
        "md": f"{Heading.INTENT_CONFIRMED.value}{NEWLINE}All required sections present.",
        "data": {
            DataKey.INTENT_CONFIRMED.value: True,
            DataKey.CONFIRMATION_MD.value: f"{Heading.CONFIRMATION.value}{NEWLINE}Proceed with: {normalized_task}",
            DataKey.NEXT_ACTION_MD.value: NEXT_ACTION_PROCEED_RINNEGAN,
        },
        "next": NextAction.CALL_PLAN_REQUIREMENTS.value,
    }

def _scaffold_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    files = payload["payload"]["files"]
    duplicate_paths = sorted({path for path, count in Counter(item["path"] for item in files).items() if count > 1})
    weak_reasons = sorted({item["path"] for item in files if len(item["reason"].strip()) < 10})
    issues: List[str] = []
    if duplicate_paths:
        issues.append(f"Duplicate file entries: {', '.join(duplicate_paths)}")
    if weak_reasons:
        issues.append(f"Reasons must describe intent (>=10 chars) for: {', '.join(weak_reasons)}")
    has_create = any(item["intent"] == "create" for item in files)
    has_modify = any(item["intent"] == "modify" for item in files)
    has_delete = any(item["intent"] == "delete" for item in files)
    checklist = [Heading.SCAFFOLD_CHECKLIST.value]
    checklist.append(CHECKBOX_TEMPLATE.format(mark="x" if has_create else " ", label="New files scoped"))
    checklist.append(CHECKBOX_TEMPLATE.format(mark="x" if has_modify else " ", label="Existing files accounted"))
    checklist.append(CHECKBOX_TEMPLATE.format(mark="x" if has_delete else " ", label="Removals reviewed"))
    checklist.append(CHECKBOX_TEMPLATE.format(mark="x" if not weak_reasons else " ", label="Each file has a meaningful reason"))
    checklist.append(CHECKBOX_TEMPLATE.format(mark="x" if not duplicate_paths else " ", label="No duplicate paths"))
    checklist_md = NEWLINE.join(checklist)
    if issues:
        issues_md = f"{Heading.PLAN_ISSUES.value}{NEWLINE}" + NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in issues)
        fix_md = f"{Heading.PLAN_FIX.value}{NEWLINE}" + NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in issues)
        return {
            "ok": False,
            "code": StatusCode.E_SCAFFOLD_ISSUES.value,
            "md": f"{Heading.SCAFFOLD_REJECTED.value}{NEWLINE}Resolve the deficiencies listed.",
            "data": {
                DataKey.APPROVED.value: False,
                DataKey.CHECKLIST_MD.value: checklist_md,
                DataKey.ISSUES_MD.value: issues_md,
                DataKey.FIX_INSTRUCTIONS_MD.value: fix_md,
            },
            "next": NextAction.RESUBMIT_SCAFFOLD.value,
        }
    return {
        "ok": True,
        "code": StatusCode.OK_SCAFFOLD_APPROVED.value,
        "md": f"{Heading.SCAFFOLD_APPROVED.value}{NEWLINE}Proceed to implementation diffs.",
        "data": {
            DataKey.APPROVED.value: True,
            DataKey.CHECKLIST_MD.value: checklist_md,
            DataKey.ISSUES_MD.value: f"{Heading.PLAN_ISSUES.value}{NEWLINE}- None",
            DataKey.FIX_INSTRUCTIONS_MD.value: NO_ACTION_NEEDED,
        },
        "next": NextAction.GO_TO_IMPL.value,
    }

def _impl_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    diffs_md = payload["payload"]["diffs_md"]
    issues: List[str] = []
    if CODE_FENCE_DIFF not in diffs_md:
        issues.append("Provide implementation diffs inside ```diff fences.")
    if any(token in diffs_md for token in IMPLEMENTATION_FORBIDDEN_TOKENS):
        issues.append("Remove TODO/FIXME placeholders from implementation diffs.")
    checklist = [Heading.IMPLEMENTATION_CHECKLIST.value]
    checklist.append(CHECKBOX_TEMPLATE.format(mark="x" if CODE_FENCE_DIFF in diffs_md else " ", label="Diff provided in fenced block"))
    checklist.append(CHECKBOX_TEMPLATE.format(mark="x" if "+" in diffs_md else " ", label="Adds new code paths"))
    checklist.append(CHECKBOX_TEMPLATE.format(mark="x" if "-" in diffs_md else " ", label="Handles removals/cleanup"))
    checklist.append(CHECKBOX_TEMPLATE.format(mark="x" if not any(token in diffs_md for token in IMPLEMENTATION_FORBIDDEN_TOKENS) else " ", label="No TODO/FIXME markers"))
    checklist_md = NEWLINE.join(checklist)
    if issues:
        issues_md = f"{Heading.PLAN_ISSUES.value}{NEWLINE}" + NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in issues)
        fix_md = f"{Heading.PLAN_FIX.value}{NEWLINE}" + NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in issues)
        return {
            "ok": False,
            "code": StatusCode.E_IMPL_ISSUES.value,
            "md": f"{Heading.IMPLEMENTATION_REJECTED.value}{NEWLINE}Address the issues before resubmitting.",
            "data": {
                DataKey.APPROVED.value: False,
                DataKey.CHECKLIST_MD.value: checklist_md,
                DataKey.ISSUES_MD.value: issues_md,
                DataKey.FIX_INSTRUCTIONS_MD.value: fix_md,
            },
            "next": NextAction.RESUBMIT_IMPL.value,
        }
    return {
        "ok": True,
        "code": StatusCode.OK_IMPL_APPROVED.value,
        "md": f"{Heading.IMPLEMENTATION_APPROVED.value}{NEWLINE}Move on to test updates.",
        "data": {
            DataKey.APPROVED.value: True,
            DataKey.CHECKLIST_MD.value: checklist_md,
            DataKey.ISSUES_MD.value: f"{Heading.PLAN_ISSUES.value}{NEWLINE}- None",
            DataKey.FIX_INSTRUCTIONS_MD.value: NO_ACTION_NEEDED,
        },
        "next": NextAction.GO_TO_TESTS.value,
    }

def _tests_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    diffs_md = payload["payload"]["diffs_md"]
    coverage_summary = payload["payload"]["coverage_summary_md"]
    pattern = re.compile(COVERAGE_REGEX_PATTERN, re.IGNORECASE)
    metrics = {name.lower(): value for name, value in pattern.findall(coverage_summary)}
    has_lines = "lines" in metrics
    has_branches = "branches" in metrics
    issues: List[str] = []
    if CODE_FENCE_DIFF not in diffs_md:
        issues.append("Provide test diffs inside ```diff fences.")
    if not has_lines or not has_branches:
        issues.append("Include coverage metrics e.g. 'lines: 90%' and 'branches: 80%'.")
    checklist = [Heading.TEST_CHECKLIST.value]
    checklist.append(CHECKBOX_TEMPLATE.format(mark="x" if CODE_FENCE_DIFF in diffs_md else " ", label="Diff provided in fenced block"))
    checklist.append(CHECKBOX_TEMPLATE.format(mark="x" if has_lines else " ", label="Line coverage reported"))
    checklist.append(CHECKBOX_TEMPLATE.format(mark="x" if has_branches else " ", label="Branch coverage reported"))
    checklist_md = NEWLINE.join(checklist)
    gate = {
        "lines": ">=threshold" if has_lines else "missing",
        "branches": ">=threshold" if has_branches else "missing",
    }
    if issues:
        issues_md = f"{Heading.PLAN_ISSUES.value}{NEWLINE}" + NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in issues)
        fix_md = f"{Heading.PLAN_FIX.value}{NEWLINE}" + NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in issues)
        return {
            "ok": False,
            "code": StatusCode.E_TESTS_INSUFFICIENT.value,
            "md": f"{Heading.TESTS_REJECTED.value}{NEWLINE}Add or clarify tests before proceeding.",
            "data": {
                DataKey.APPROVED.value: False,
                DataKey.CHECKLIST_MD.value: checklist_md,
                DataKey.COVERAGE_GATE.value: gate,
                DataKey.ISSUES_MD.value: issues_md,
                DataKey.FIX_INSTRUCTIONS_MD.value: fix_md,
            },
            "next": NextAction.RESUBMIT_TESTS.value,
        }
    return {
        "ok": True,
        "code": StatusCode.OK_TESTS_APPROVED.value,
        "md": f"{Heading.TEST_GATE.value}{NEWLINE}Continue to documentation updates.",
        "data": {
            DataKey.APPROVED.value: True,
            DataKey.CHECKLIST_MD.value: checklist_md,
            DataKey.COVERAGE_GATE.value: gate,
            DataKey.ISSUES_MD.value: f"{Heading.PLAN_ISSUES.value}{NEWLINE}- None",
            DataKey.FIX_INSTRUCTIONS_MD.value: NO_ACTION_NEEDED,
        },
        "next": NextAction.GO_TO_DOCS.value,
    }

def _docs_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    diffs_md = payload["payload"]["diffs_md"]
    issues: List[str] = []
    has_diff_fence = CODE_FENCE_DIFF in diffs_md
    if not has_diff_fence:
        issues.append("Provide documentation diffs inside ```diff fences.")
    mentions_docs = any(keyword in diffs_md.lower() for keyword in DOCS_REFERENCE_KEYWORDS)
    if not mentions_docs:
        issues.append("Reference the documentation files updated (e.g., README, docs/...)")
    checklist = [Heading.DOCUMENTATION_CHECKLIST.value]
    checklist.append(CHECKBOX_TEMPLATE.format(mark="x" if has_diff_fence else " ", label="Diff provided in fenced block"))
    checklist.append(CHECKBOX_TEMPLATE.format(mark="x" if mentions_docs else " ", label="References specific docs"))
    checklist_md = NEWLINE.join(checklist)
    if issues:
        issues_md = f"{Heading.PLAN_ISSUES.value}{NEWLINE}" + NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in issues)
        fix_md = f"{Heading.PLAN_FIX.value}{NEWLINE}" + NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in issues)
        return {
            "ok": False,
            "code": StatusCode.E_DOCS_MISSING.value,
            "md": f"{Heading.DOCS_REJECTED.value}{NEWLINE}Clarify documentation coverage.",
            "data": {
                DataKey.APPROVED.value: False,
                DataKey.CHECKLIST_MD.value: checklist_md,
                DataKey.ISSUES_MD.value: issues_md,
                DataKey.FIX_INSTRUCTIONS_MD.value: fix_md,
            },
            "next": NextAction.RESUBMIT_DOCS.value,
        }
    return {
        "ok": True,
        "code": StatusCode.OK_DOCS_APPROVED.value,
        "md": f"{Heading.DOCS_APPROVED.value}{NEWLINE}All documentation updates accounted.",
        "data": {
            DataKey.APPROVED.value: True,
            DataKey.CHECKLIST_MD.value: checklist_md,
            DataKey.ISSUES_MD.value: f"{Heading.PLAN_ISSUES.value}{NEWLINE}- None",
            DataKey.FIX_INSTRUCTIONS_MD.value: NO_ACTION_NEEDED,
        },
        "next": NextAction.GO_TO_FINAL.value,
    }

def _tenseigan_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    draft_md = payload["payload"]["draft_md"]
    claims = []
    for line in draft_md.splitlines():
        stripped = line.strip()
        if stripped.startswith("- "):
            claims.append(stripped[2:].strip())
    citation_start = None
    lines = draft_md.splitlines()
    for index, line in enumerate(lines):
        if line.strip().startswith("| Claim |"):
            citation_start = index
            break
    if citation_start is None:
        citations_md = EMPTY_CITATIONS_TABLE
        mapping = {}
    else:
        table_lines = lines[citation_start:]
        citations_md = NEWLINE.join([Heading.CITATIONS.value, *table_lines])
        mapping = {}
        for row in table_lines[2:]:
            parts = [part.strip() for part in row.strip().strip("|").split("|")]
            if len(parts) >= 2 and parts[0]:
                mapping[parts[0]] = parts[1]
    if claims and not mapping:
        return {
            "ok": False,
            "code": StatusCode.E_CITATIONS_MISSING.value,
            "md": f"{Heading.REJECTED.value}{NEWLINE}Claims lack citations. Provide a per-claim source table.",
            "data": {
                DataKey.CLAIMS_MD.value: NO_CLAIMS_MARKDOWN if not claims else f"{Heading.CLAIMS.value}{NEWLINE}" + NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in claims),
                DataKey.CITATIONS_MD.value: citations_md,
                DataKey.APPROVED.value: False,
                DataKey.ISSUES_MD.value: f"{Heading.PLAN_ISSUES.value}{NEWLINE}- Missing citation table",
                DataKey.FIX_INSTRUCTIONS_MD.value: f"{Heading.PLAN_FIX.value}{NEWLINE}- Add a '| Claim | Source | Confidence |' table covering each claim.",
            },
            "next": NextAction.ADD_CITATIONS.value,
        }
    unsupported = [claim for claim in claims if claim not in mapping]
    if unsupported:
        issues_md = f"{Heading.PLAN_ISSUES.value}{NEWLINE}" + NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in unsupported)
        return {
            "ok": False,
            "code": StatusCode.E_UNSUPPORTED_CLAIMS.value,
            "md": f"{Heading.REJECTED.value}{NEWLINE}Every factual claim must reference a source.",
            "data": {
                DataKey.CLAIMS_MD.value: f"{Heading.CLAIMS.value}{NEWLINE}" + NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in claims) if claims else NO_CLAIMS_MARKDOWN,
                DataKey.CITATIONS_MD.value: citations_md,
                DataKey.APPROVED.value: False,
                DataKey.ISSUES_MD.value: issues_md,
                DataKey.FIX_INSTRUCTIONS_MD.value: f"{Heading.PLAN_FIX.value}{NEWLINE}- Provide a source for each unsupported claim or remove it.",
            },
            "next": NextAction.FIX_CLAIMS.value,
        }
    claims_md = NO_CLAIMS_MARKDOWN if not claims else f"{Heading.CLAIMS.value}{NEWLINE}" + NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in claims)
    summary_heading = Heading.NO_VERIFIABLE_CLAIMS.value if not claims else Heading.CLAIMS_VALIDATED.value
    summary_body = "No factual statements detected." if not claims else "All claims map to citations."
    return {
        "ok": True,
        "code": StatusCode.OK_TEXT_VALIDATED.value,
        "md": f"{summary_heading}{NEWLINE}{summary_body}",
        "data": {
            DataKey.CLAIMS_MD.value: claims_md,
            DataKey.CITATIONS_MD.value: citations_md if citation_start is not None else EMPTY_CITATIONS_TABLE,
            DataKey.APPROVED.value: True,
            DataKey.ISSUES_MD.value: f"{Heading.PLAN_ISSUES.value}{NEWLINE}- None",
            DataKey.FIX_INSTRUCTIONS_MD.value: NO_ACTION_NEEDED,
        },
        "next": NextAction.GO_TO_BYAKUGAN.value,
    }

def _byakugan_response(payload: Dict[str, Any]) -> Dict[str, Any]:
    draft_md = payload["payload"]["draft_md"]
    normalized = draft_md.lower()
    issues: List[str] = []
    if any(token in normalized for token in CONSISTENCY_FORBIDDEN_TOKENS):
        issues.append("Draft contains TODO/TBD markers.")
    for negative, positive in CONSISTENCY_CONTRADICTION_PATTERNS:
        if re.search(negative, normalized) and re.search(positive, normalized):
            issues.append(f"Found conflicting statements matching '{negative}' and '{positive}'.")
    if issues:
        issues_md = f"{Heading.CONSISTENCY.value}{NEWLINE}" + NEWLINE.join(ISSUE_BULLET_TEMPLATE.format(item=item) for item in issues)
        return {
            "ok": False,
            "code": StatusCode.E_CONTRADICTION_DETECTED.value,
            "md": f"{Heading.REJECTED.value}{NEWLINE}Resolve the detected contradictions before finalizing.",
            "data": {
                DataKey.CONSISTENT.value: False,
                DataKey.ANALYSIS_MD.value: issues_md,
            },
            "next": NextAction.FIX_CONTRADICTIONS.value,
        }
    return {
        "ok": True,
        "code": StatusCode.OK_CONSISTENT.value,
        "md": f"{Heading.CONSISTENCY.value}{NEWLINE}Draft aligns with prior context.",
        "data": {
            DataKey.CONSISTENT.value: True,
            DataKey.ANALYSIS_MD.value: CONSISTENCY_DEFAULT_ANALYSIS,
        },
        "next": NextAction.GO_TO_FINAL.value,
    }

def _final_response(tool: ToolName, payload: Dict[str, Any]) -> Dict[str, Any]:
    if tool == ToolName.OVERSEER_NAVIGATOR:
        return {
            "ok": True,
            "code": StatusCode.OK_OVERSEER_GUIDE.value,
            "md": f"{Heading.OVERSEER_INTRO.value}{NEWLINE}Third Eye MCP oversees the pipeline.",
            "data": {
                DataKey.SUMMARY_MD.value: f"{Heading.OVERSEER_INTRO.value}{NEWLINE}Third Eye MCP oversees the pipeline.",
                DataKey.INSTRUCTIONS_MD.value: f"{Heading.OVERSEER_NEXT_STEPS.value}{NEWLINE}- Start with sharingan/clarify",
                DataKey.SCHEMA_MD.value: f"{Heading.REQUEST_ENVELOPE.value}{NEWLINE}```json\n{{}}\n```",
                DataKey.EXAMPLE_MD.value: "```json\n{}\n```",
                DataKey.CONTRACT_JSON.value: {"tools": {}},
                DataKey.NEXT_ACTION_MD.value: f"{Heading.NEXT_ACTION.value}{NEWLINE}{NextAction.BEGIN_WITH_SHARINGAN.value}",
            },
            "next": NextAction.BEGIN_WITH_SHARINGAN.value,
        }
    if tool == ToolName.SHARINGAN_CLARIFY:
        return _sharingan_response(payload)
    if tool == ToolName.PROMPT_HELPER_REWRITE:
        return _prompt_helper_response(payload)
    if tool == ToolName.JOGAN_CONFIRM_INTENT:
        return _jogan_response(payload)
    if tool == ToolName.MANGEKYO_REVIEW_SCAFFOLD:
        return _scaffold_response(payload)
    if tool == ToolName.MANGEKYO_REVIEW_IMPL:
        return _impl_response(payload)
    if tool == ToolName.MANGEKYO_REVIEW_TESTS:
        return _tests_response(payload)
    if tool == ToolName.MANGEKYO_REVIEW_DOCS:
        return _docs_response(payload)
    if tool == ToolName.TENSEIGAN_VALIDATE_CLAIMS:
        return _tenseigan_response(payload)
    if tool == ToolName.BYAKUGAN_CONSISTENCY_CHECK:
        return _byakugan_response(payload)
    raise NotImplementedError(f"LLM stub not implemented for tool {tool.value}")


@pytest.fixture(autouse=True)
def llm_stub(monkeypatch):
    from third_eye.eyes import _llm

    def _invoke(tool: ToolName, persona_key, payload: Dict[str, Any]) -> Dict[str, Any]:
        return _final_response(tool, payload)

    monkeypatch.setattr(_llm, "invoke_llm", _invoke)
    from third_eye.eyes import _shared

    monkeypatch.setattr(_shared, "invoke_llm", _invoke)
    yield
