import {
  EyeTag,
  StatusCode,
  NextAction,
  Heading,
  DataKey,
  SCHEMA_SECTION_LABELS,
  SCHEMA_TABLE_HEADER,
  SCHEMA_TABLE_DIVIDER,
  CHECKBOX_TEMPLATE,
  ISSUE_BULLET_TEMPLATE,
  NO_ACTION_NEEDED
} from "../constants";
import { buildResponse } from "../shared";
import type { EyeResponse } from "../constants";

function missingSections(markdown: string): string[] {
  return SCHEMA_SECTION_LABELS.filter(section => !markdown.includes(section));
}

function checklistMarkdown(missingSections: string[], markdown: string): string {
  const lines = [Heading.PLAN_CHECKLIST];

  for (const section of SCHEMA_SECTION_LABELS) {
    const mark = missingSections.includes(section) ? " " : "x";
    lines.push(CHECKBOX_TEMPLATE.replace("{mark}", mark).replace("{label}", section));
  }

  const tablePresent = markdown.includes(SCHEMA_TABLE_HEADER) && markdown.includes(SCHEMA_TABLE_DIVIDER);
  const tableMark = tablePresent ? "x" : " ";
  lines.push(CHECKBOX_TEMPLATE.replace("{mark}", tableMark).replace("{label}", "File impact table uses Markdown columns"));

  return lines.join("\n");
}

function issuesMarkdown(issues: string[]): string {
  if (issues.length === 0) {
    return `${Heading.PLAN_ISSUES}\n- None`;
  }
  const bullets = issues.map(item => ISSUE_BULLET_TEMPLATE.replace("{item}", item)).join("\n");
  return `${Heading.PLAN_ISSUES}\n${bullets}`;
}

function fixInstructionsMarkdown(issues: string[]): string {
  if (issues.length === 0) {
    return NO_ACTION_NEEDED;
  }
  const bullets = issues.map(item => ISSUE_BULLET_TEMPLATE.replace("{item}", item)).join("\n");
  return `${Heading.PLAN_FIX}\n${bullets}`;
}

export interface PlanReviewRequest {
  payload: {
    submitted_plan_md: string;
  };
  context?: {
    settings?: {
      require_rollback?: boolean;
    };
  };
}

export function planReview(request: PlanReviewRequest): EyeResponse {
  const planMarkdown = request.payload.submitted_plan_md;
  let missing = missingSections(planMarkdown);

  const requireRollback = request.context?.settings?.require_rollback ?? true;
  if (!requireRollback && missing.includes("Rollback Plan")) {
    missing = missing.filter(s => s !== "Rollback Plan");
  }

  const issues: string[] = [];

  if (missing.length > 0) {
    issues.push(`Missing sections: ${missing.join(", ")}`);
  }

  if (!planMarkdown.includes(SCHEMA_TABLE_HEADER) || !planMarkdown.includes(SCHEMA_TABLE_DIVIDER)) {
    issues.push("File Impact Table must include a Markdown table with Path, Action, Reason columns.");
  }

  const checklistMd = checklistMarkdown(missing, planMarkdown);
  const issuesMd = issuesMarkdown(issues);
  const fixInstructionsMd = fixInstructionsMarkdown(issues);

  if (issues.length > 0) {
    return buildResponse({
      tag: EyeTag.RINNEGAN,
      ok: false,
      code: StatusCode.E_PLAN_INCOMPLETE,
      md: `${Heading.PLAN_REJECTED}\nResolve the issues listed before resubmitting.`,
      data: {
        [DataKey.APPROVED]: false,
        [DataKey.CHECKLIST_MD]: checklistMd,
        [DataKey.ISSUES_MD]: issuesMd,
        [DataKey.FIX_INSTRUCTIONS_MD]: fixInstructionsMd
      },
      next_action: NextAction.RESUBMIT_PLAN
    });
  }

  return buildResponse({
    tag: EyeTag.RINNEGAN,
    ok: true,
    code: StatusCode.OK_PLAN_APPROVED,
    md: `${Heading.PLAN_APPROVED}\nAll acceptance criteria satisfied.`,
    data: {
      [DataKey.APPROVED]: true,
      [DataKey.CHECKLIST_MD]: checklistMd,
      [DataKey.ISSUES_MD]: issuesMd,
      [DataKey.FIX_INSTRUCTIONS_MD]: fixInstructionsMd
    },
    next_action: NextAction.GO_TO_MANGEKYO_SCAFFOLD
  });
}
