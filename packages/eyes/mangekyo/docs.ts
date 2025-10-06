import {
  EyeTag,
  StatusCode,
  NextAction,
  Heading,
  DataKey
} from "../constants";
import { buildResponse } from "../shared";
import type { EyeResponse } from "../constants";

function getStrictness(request: ReviewDocsRequest): "lenient" | "normal" | "strict" {
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

export interface ReviewDocsRequest {
  payload: {
    diffs_md: string;
  };
  reasoning_md?: string;
  context?: {
    settings?: {
      mangekyo?: string;
    };
  };
}

export function reviewDocs(request: ReviewDocsRequest): EyeResponse {
  if (!request.reasoning_md || !request.reasoning_md.trim()) {
    return buildResponse({
      tag: EyeTag.MANGEKYO,
      ok: false,
      code: StatusCode.E_REASONING_MISSING,
      md: `${Heading.REASONING}\nDescribe documentation updates before submitting.`,
      data: { [DataKey.ISSUES_MD]: "Reasoning required." },
      next_action: NextAction.RESUBMIT_DOCS
    });
  }

  const diffsMarkdown = (request.payload.diffs_md || "").toLowerCase();
  const hasDocsReference = ["readme", "docs/", "doc/", "documentation"].some(token =>
    diffsMarkdown.includes(token)
  );

  if (!hasDocsReference) {
    const md = `${Heading.DOCS_REJECTED}\nReference the documentation artifact being updated.`;
    return buildResponse({
      tag: EyeTag.MANGEKYO,
      ok: false,
      code: StatusCode.E_DOCS_MISSING,
      md,
      data: {
        [DataKey.ISSUES_MD]: "Mention README/docs/changelog updates in the diff.",
        mangekyo_strictness: getStrictness(request)
      },
      next_action: NextAction.RESUBMIT_DOCS
    });
  }

  const level = getStrictness(request);
  const checklist = `${Heading.DOCUMENTATION_CHECKLIST}\n- Diff references documentation\n- Reasoning supplied\n- Strictness: ${level.charAt(0).toUpperCase() + level.slice(1)}`;

  const data = {
    [DataKey.CHECKLIST_MD]: checklist,
    [DataKey.ISSUES_MD]: "",
    mangekyo_strictness: level
  };

  const md = `${Heading.DOCS_APPROVED}\nDocumentation updates look complete.`;

  return buildResponse({
    tag: EyeTag.MANGEKYO,
    ok: true,
    code: StatusCode.OK_DOCS_APPROVED,
    md,
    data,
    next_action: NextAction.GO_TO_FINAL
  });
}
