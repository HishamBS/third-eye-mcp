import {
  EyeTag,
  StatusCode,
  NextAction,
  Heading,
  DataKey
} from "../constants";
import { buildResponse } from "../shared";
import type { EyeResponse } from "../constants";

const EXPECTED_SCHEMA = `### Plan Schema
1. High-Level Overview
2. File Impact Table (path, action, reason)
3. Step-by-step Implementation Plan
4. Error Handling & Edge Cases
5. Test Strategy
6. Rollback Plan
7. Documentation Updates`.trim();

const EXAMPLE_PLAN = `### Example Plan
1. High-Level Overview
   - Add notification dropdown to dashboard header
2. File Impact Table
   | Path | Action | Reason |
   |---|---|---|
   | src/components/Header.tsx | modify | Render bell icon and menu |
   | src/hooks/useNotifications.ts | create | Fetch notifications from API |
3. Step-by-step Implementation Plan
   1. Add API client for notifications
   2. Render bell icon with badge
   3. Implement dropdown listing notifications
4. Error Handling & Edge Cases
   - Gracefully handle network timeouts
   - Empty states for zero notifications
5. Test Strategy
   - Add component tests for dropdown
   - Add integration test for unread badge
6. Rollback Plan
   - Revert feature flag or remove dropdown component
7. Documentation Updates
   - Update README usage section
   - Add changelog entry`.trim();

const ACCEPTANCE_CRITERIA = `### Acceptance Criteria
- Plan lists ALL files to be changed with reasons
- Includes error handling/test strategy
- Includes rollback`.trim();

export interface PlanRequirementsRequest {
  payload: Record<string, any>;
}

export function planRequirements(_request: PlanRequirementsRequest): EyeResponse {
  const md = `${Heading.PLAN_SCHEMA}\nHost must supply a plan matching the schema.`;
  const data = {
    [DataKey.EXPECTED_SCHEMA_MD]: EXPECTED_SCHEMA,
    [DataKey.EXAMPLE_MD]: EXAMPLE_PLAN,
    [DataKey.ACCEPTANCE_CRITERIA_MD]: ACCEPTANCE_CRITERIA
  };

  return buildResponse({
    tag: EyeTag.RINNEGAN,
    ok: true,
    code: StatusCode.OK_SCHEMA_EMITTED,
    md,
    data,
    next_action: NextAction.SUBMIT_PLAN_REVIEW
  });
}
