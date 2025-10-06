import {
  EyeTag,
  StatusCode,
  NextAction,
  Heading,
  DataKey
} from "../constants";
import { buildResponse } from "../shared";
import type { EyeResponse } from "../constants";

const COVERAGE_PATTERN = /(lines|branches)\s*:\s*(\d+)%/gi;

const THRESHOLDS = {
  lenient: { lines: 70, branches: 55 },
  normal: { lines: 75, branches: 60 },
  strict: { lines: 85, branches: 75 }
};

function getStrictness(request: ReviewTestsRequest): "lenient" | "normal" | "strict" {
  const settings = request.context?.settings;
  const value = settings?.mangekyo;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (lowered === "lenient" || lowered === "normal" || lowered === "strict") {
      return lowered as "lenient" | "normal" | "strict";
    }
  }
  return "normal";
}

function parseCoverage(summary: string): { lines: number; branches: number } {
  const results: { lines: number; branches: number } = { lines: 0, branches: 0 };
  const matches = summary.matchAll(COVERAGE_PATTERN);

  for (const match of matches) {
    const label = match[1].toLowerCase();
    const value = parseInt(match[2], 10);
    if (label === "lines" || label === "branches") {
      results[label] = value;
    }
  }

  return results;
}

export interface ReviewTestsRequest {
  payload: {
    diffs_md: string;
    coverage_summary_md: string;
  };
  reasoning_md?: string;
  context?: {
    settings?: {
      mangekyo?: string;
    };
  };
}

export function reviewTests(request: ReviewTestsRequest): EyeResponse {
  if (!request.reasoning_md || !request.reasoning_md.trim()) {
    return buildResponse({
      tag: EyeTag.MANGEKYO,
      ok: false,
      code: StatusCode.E_REASONING_MISSING,
      md: `${Heading.REASONING}\nExplain the regression coverage provided.`,
      data: { [DataKey.ISSUES_MD]: "Reasoning required." },
      next_action: NextAction.RESUBMIT_TESTS
    });
  }

  const level = getStrictness(request);
  const thresholds = THRESHOLDS[level];

  const coverageSummary = request.payload.coverage_summary_md || "";
  const coverage = parseCoverage(coverageSummary);
  const lines = coverage.lines;
  const branches = coverage.branches;

  if (lines < thresholds.lines || branches < thresholds.branches) {
    const issues = `Coverage insufficient for ${level} mode (lines: ${lines}% / required ${thresholds.lines}%, branches: ${branches}% / required ${thresholds.branches}%).`;
    const md = `${Heading.TESTS_REJECTED}\n${issues}`;

    return buildResponse({
      tag: EyeTag.MANGEKYO,
      ok: false,
      code: StatusCode.E_TESTS_INSUFFICIENT,
      md,
      data: {
        [DataKey.ISSUES_MD]: issues,
        mangekyo_strictness: level
      },
      next_action: NextAction.RESUBMIT_TESTS
    });
  }

  const checklist = `${Heading.TEST_CHECKLIST}\n- Coverage summary provided\n- Reasoning supplied\n- Strictness: ${level.charAt(0).toUpperCase() + level.slice(1)}`;

  const data = {
    [DataKey.CHECKLIST_MD]: checklist,
    [DataKey.ISSUES_MD]: "",
    mangekyo_strictness: level
  };

  const md = `${Heading.TEST_GATE}\nTest coverage meets expectations.`;

  return buildResponse({
    tag: EyeTag.MANGEKYO,
    ok: true,
    code: StatusCode.OK_TESTS_APPROVED,
    md,
    data,
    next_action: NextAction.GO_TO_DOCS
  });
}
