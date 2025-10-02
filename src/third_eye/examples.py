"""Authoritative example payloads for Eye schemas."""
from __future__ import annotations

EXAMPLE_CONTEXT = {
    "session_id": "sess-123",
    "user_id": "user-456",
    "lang": "en",
    "budget_tokens": 0,
}

EXAMPLE_SHARINGAN = {
    "context": EXAMPLE_CONTEXT,
    "payload": {
        "prompt": "Summarize the latest quarterly report for Acme Corp.",
        "lang": "en",
    },
}

EXAMPLE_PROMPT_HELPER = {
    "context": EXAMPLE_CONTEXT,
    "payload": {
        "user_prompt": "Create onboarding checklist",
        "clarification_answers_md": "### Clarification Answers\n1. Audience: internal team",
    },
}

EXAMPLE_JOGAN = {
    "context": EXAMPLE_CONTEXT,
    "payload": {
        "refined_prompt_md": "### Optimized Prompt\nROLE: Analyst\nTASK: Summarize Q2 results\nCONTEXT:\n- Audience: executives\nREQUIREMENTS:\n- Cite sources\nOUTPUT:\n- 300-word summary",
        "estimated_tokens": 1200,
    },
}

EXAMPLE_PLAN_REQUIREMENTS = {
    "context": EXAMPLE_CONTEXT,
    "payload": {
        "summary_md": "### Summary\nImplement notification feature in dashboard",
    },
}

EXAMPLE_PLAN_REVIEW = {
    "context": EXAMPLE_CONTEXT,
    "payload": {
        "submitted_plan_md": "### Plan\n1. High-Level Overview\n...",
    },
    "reasoning_md": "### Reasoning\nPlan covers rollout and risk mitigation.",
}

EXAMPLE_FINAL_APPROVAL = {
    "context": EXAMPLE_CONTEXT,
    "payload": {
        "plan_approved": True,
        "scaffold_approved": True,
        "impl_approved": True,
        "tests_approved": True,
        "docs_approved": True,
        "text_validated": True,
        "consistent": True,
    },
}

EXAMPLE_SCAFFOLD = {
    "context": EXAMPLE_CONTEXT,
    "payload": {
        "files": [
            {"path": "src/app.py", "intent": "modify", "reason": "Update handler"},
        ],
    },
    "reasoning_md": "Covers affected files",
}

EXAMPLE_IMPL = {
    "context": EXAMPLE_CONTEXT,
    "payload": {
        "diffs_md": "```diff\n+ new code\n- old code\n```",
    },
    "reasoning_md": "Explains trade-offs and risks.",
}

EXAMPLE_TESTS = {
    "context": EXAMPLE_CONTEXT,
    "payload": {
        "diffs_md": "```diff\n+ new test\n```",
        "coverage_summary_md": "lines: 90%\nbranches: 85%",
    },
    "reasoning_md": "Coverage summary",
}

EXAMPLE_DOCS = {
    "context": EXAMPLE_CONTEXT,
    "payload": {
        "diffs_md": "```diff\n+ Update README\n```",
    },
    "reasoning_md": "Document changes",
}

EXAMPLE_TENSEIGAN = {
    "context": EXAMPLE_CONTEXT,
    "payload": {
        "draft_md": (
            "### Draft\n- Market grew 25% YoY\n\n"
            "### Citations\n| Claim | Source | Confidence |\n|---|---|---|\n| Market grew 25% YoY | https://example.com/report | 0.9 |"
        ),
    },
    "reasoning_md": "Evidence review",
}

EXAMPLE_BYAKUGAN = {
    "context": EXAMPLE_CONTEXT,
    "payload": {
        "topic": "market-update",
        "draft_md": "### Draft\nThe market grew 25% YoY.\nNo contractions reported.",
    },
    "reasoning_md": "Consistency check",
}

EXAMPLE_NAVIGATOR = {
    "context": EXAMPLE_CONTEXT,
    "payload": {"goal": "Generate a quarterly engineering report"},
}

__all__ = [
    "EXAMPLE_CONTEXT",
    "EXAMPLE_SHARINGAN",
    "EXAMPLE_PROMPT_HELPER",
    "EXAMPLE_JOGAN",
    "EXAMPLE_PLAN_REQUIREMENTS",
    "EXAMPLE_PLAN_REVIEW",
    "EXAMPLE_FINAL_APPROVAL",
    "EXAMPLE_SCAFFOLD",
    "EXAMPLE_IMPL",
    "EXAMPLE_TESTS",
    "EXAMPLE_DOCS",
    "EXAMPLE_TENSEIGAN",
    "EXAMPLE_BYAKUGAN",
    "EXAMPLE_NAVIGATOR",
]
