import {
  EyeTag,
  StatusCode,
  NextAction,
  Heading,
  DataKey,
  CONSISTENCY_CONTRADICTION_PATTERNS
} from "./constants";
import { buildResponse } from "./shared";
import type { EyeResponse } from "./constants";
import { MarkdownBuilder } from "./utils/markdown-builder";

const DEFAULT_TOLERANCE = 0.85;

function consistencyScore(markdown: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 1.0;
  const lower = markdown.toLowerCase();

  const hasTodoMarkers = /\b(todo|tbd|fixme)\b/i.test(lower);
  if (hasTodoMarkers) {
    score -= 0.4;
    issues.push("Remove TODO/TBD markers before approval.");
  }

  for (const [first, second] of CONSISTENCY_CONTRADICTION_PATTERNS) {
    if (first.test(lower) && second.test(lower)) {
      score -= 0.3;
      issues.push("Detected conflicting statements in draft.");
    }
  }

  if (lower.includes("no change")) {
    const hasGrowthDecline = ["increase", "decrease", "grew", "declined"].some(kw =>
      lower.includes(kw)
    );
    if (hasGrowthDecline) {
      score -= 0.2;
      issues.push("Draft mentions 'no change' alongside growth/decline statements.");
    }
  }

  return { score: Math.max(0.0, Math.min(1.0, score)), issues };
}

export interface ByakuganRequest {
  payload: {
    draft_md: string;
    topic: string;
  };
  reasoning_md?: string;
  context?: {
    settings?: {
      consistency_tolerance?: number;
    };
  };
}

export function consistencyCheck(request: ByakuganRequest): EyeResponse {
  if (!request.reasoning_md || !request.reasoning_md.trim()) {
    const md = MarkdownBuilder.create()
      .heading(Heading.REASONING)
      .text("Describe how the draft was validated for contradictions.")
      .build();
    return buildResponse({
      tag: EyeTag.BYAKUGAN,
      ok: false,
      code: StatusCode.E_REASONING_MISSING,
      md,
      data: {
        [DataKey.ISSUES_MD]: MarkdownBuilder.create()
          .heading(Heading.REASONING)
          .text("Reasoning required.")
          .build()
      },
      next_action: NextAction.FIX_CONTRADICTIONS
    });
  }

  const tolerance = request.context?.settings?.consistency_tolerance ?? DEFAULT_TOLERANCE;
  const draftMarkdown = request.payload.draft_md;
  const { score, issues } = consistencyScore(draftMarkdown);

  if (issues.length > 0 && score < tolerance) {
    const issuesMarkdown = MarkdownBuilder.create()
      .heading(Heading.CONSISTENCY)
      .bullets(issues)
      .build();
    const md = MarkdownBuilder.create()
      .heading(Heading.CONSISTENCY)
      .text(`Consistency score ${score.toFixed(2)} below tolerance ${tolerance.toFixed(2)}.`)
      .build();
    return buildResponse({
      tag: EyeTag.BYAKUGAN,
      ok: false,
      code: StatusCode.E_CONTRADICTION_DETECTED,
      md,
      data: {
        [DataKey.ISSUES_MD]: issuesMarkdown,
        consistency_score: score
      },
      next_action: NextAction.FIX_CONTRADICTIONS
    });
  }

  const md = MarkdownBuilder.create()
    .heading(Heading.CONSISTENCY)
    .text(`No contradictions detected for topic \`${request.payload.topic}\`.`)
    .build();
  return buildResponse({
    tag: EyeTag.BYAKUGAN,
    ok: true,
    code: StatusCode.OK_CONSISTENT,
    md,
    data: {
      [DataKey.ISSUES_MD]: "",
      consistency_score: score
    },
    next_action: NextAction.RETURN_DELIVERABLE
  });
}
