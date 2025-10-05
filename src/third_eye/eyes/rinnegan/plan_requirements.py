"""Rinnegan plan schema emission."""
from __future__ import annotations

import asyncio
from typing import Any, Dict

from ...constants import (
    DataKey,
    EyeTag,
    Heading,
    NEWLINE,
    NextAction,
    StatusCode,
)
from ...examples import EXAMPLE_PLAN_REQUIREMENTS
from ...schemas import EyeResponse, PlanRequirementsRequest
from .._shared import build_response, execute_eye, execute_eye_async

_EXAMPLE_REQUEST = EXAMPLE_PLAN_REQUIREMENTS

_EXPECTED_SCHEMA = """### Plan Schema\n1. High-Level Overview\n2. File Impact Table (path, action, reason)\n3. Step-by-step Implementation Plan\n4. Error Handling & Edge Cases\n5. Test Strategy\n6. Rollback Plan\n7. Documentation Updates""".strip()

_EXAMPLE_PLAN = """### Example Plan\n1. High-Level Overview\n   - Add notification dropdown to dashboard header\n2. File Impact Table\n   | Path | Action | Reason |\n   |---|---|---|\n   | src/components/Header.tsx | modify | Render bell icon and menu |\n   | src/hooks/useNotifications.ts | create | Fetch notifications from API |\n3. Step-by-step Implementation Plan\n   1. Add API client for notifications\n   2. Render bell icon with badge\n   3. Implement dropdown listing notifications\n4. Error Handling & Edge Cases\n   - Gracefully handle network timeouts\n   - Empty states for zero notifications\n5. Test Strategy\n   - Add component tests for dropdown\n   - Add integration test for unread badge\n6. Rollback Plan\n   - Revert feature flag or remove dropdown component\n7. Documentation Updates\n   - Update README usage section\n   - Add changelog entry""".strip()

_ACCEPTANCE_CRITERIA = """### Acceptance Criteria\n- Plan lists ALL files to be changed with reasons\n- Includes error handling/test strategy\n- Includes rollback""".strip()


async def plan_requirements_async(raw: Dict[str, Any]) -> Dict[str, Any]:
    return await execute_eye_async(
        tag=EyeTag.RINNEGAN_PLAN_REQUIREMENTS,
        model=PlanRequirementsRequest,
        handler=_handle,
        raw=raw,
        example=_EXAMPLE_REQUEST,
    )


def plan_requirements(raw: Dict[str, Any]) -> Dict[str, Any]:
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(plan_requirements_async(raw))
    raise RuntimeError(
        "plan_requirements() cannot be called from an active event loop; use await plan_requirements_async() instead."
    )


def _handle(request: PlanRequirementsRequest) -> EyeResponse:
    md = f"{Heading.PLAN_SCHEMA.value}{NEWLINE}Host must supply a plan matching the schema."
    data = {
        DataKey.EXPECTED_SCHEMA_MD.value: _EXPECTED_SCHEMA,
        DataKey.EXAMPLE_MD.value: _EXAMPLE_PLAN,
        DataKey.ACCEPTANCE_CRITERIA_MD.value: _ACCEPTANCE_CRITERIA,
    }
    return build_response(
        tag=EyeTag.RINNEGAN_PLAN_REQUIREMENTS,
        ok=True,
        code=StatusCode.OK_SCHEMA_EMITTED,
        md=md,
        data=data,
        next_action=NextAction.SUBMIT_PLAN_REVIEW.value,
    )


__all__ = ["plan_requirements", "plan_requirements_async"]
