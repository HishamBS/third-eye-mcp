import {
  EyeTag,
  StatusCode,
  NextAction,
  Heading,
  DataKey,
  SCHEMA_SECTION_LABELS,
  SCHEMA_TABLE_HEADER,
  SCHEMA_TABLE_DIVIDER
} from "../constants";
import { buildResponse } from "../shared";
import type { EyeResponse } from "../constants";
import { MarkdownBuilder } from "../utils/markdown-builder";

function missingSections(markdown: string): string[] {
  return SCHEMA_SECTION_LABELS.filter(section => !markdown.includes(section));
}

function checklistMarkdown(missingSections: string[], markdown: string): string {
  const builder = MarkdownBuilder.create().heading(Heading.PLAN_CHECKLIST);

  for (const section of SCHEMA_SECTION_LABELS) {
    const checked = !missingSections.includes(section);
    builder.checklist(section, checked);
  }

  const tablePresent = markdown.includes(SCHEMA_TABLE_HEADER) && markdown.includes(SCHEMA_TABLE_DIVIDER);
  builder.checklist("File impact table uses Markdown columns", tablePresent);

  return builder.build();
}

function issuesMarkdown(issues: string[]): string {
  if (issues.length === 0) {
    return MarkdownBuilder.create()
      .heading(Heading.PLAN_ISSUES)
      .bullet("None")
      .build();
  }
  const builder = MarkdownBuilder.create().heading(Heading.PLAN_ISSUES);
  for (const issue of issues) {
    builder.bullet(issue);
  }
  return builder.build();
}

function fixInstructionsMarkdown(issues: string[]): string {
  if (issues.length === 0) {
    return MarkdownBuilder.create()
      .heading(Heading.PLAN_FIX)
      .bullet("No action needed")
      .build();
  }
  const builder = MarkdownBuilder.create().heading(Heading.PLAN_FIX);
  for (const issue of issues) {
    builder.bullet(issue);
  }
  return builder.build();
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
    const md = MarkdownBuilder.create()
      .heading(Heading.PLAN_REJECTED)
      .text("Resolve the issues listed before resubmitting.")
      .build();
    return buildResponse({
      tag: EyeTag.RINNEGAN,
      ok: false,
      code: StatusCode.E_PLAN_INCOMPLETE,
      md,
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
    md: MarkdownBuilder.create()
      .heading(Heading.PLAN_APPROVED)
      .text("All acceptance criteria satisfied.")
      .build(),
    data: {
      [DataKey.APPROVED]: true,
      [DataKey.CHECKLIST_MD]: checklistMd,
      [DataKey.ISSUES_MD]: issuesMd,
      [DataKey.FIX_INSTRUCTIONS_MD]: fixInstructionsMd
    },
    next_action: NextAction.GO_TO_MANGEKYO_SCAFFOLD
  });
}
