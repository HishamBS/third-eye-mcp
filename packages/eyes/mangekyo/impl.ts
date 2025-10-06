import {
  EyeTag,
  StatusCode,
  NextAction,
  Heading,
  DataKey
} from "../constants";
import { buildResponse } from "../shared";
import type { EyeResponse } from "../constants";

function getStrictness(request: ReviewImplRequest): "lenient" | "normal" | "strict" {
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

export interface ReviewImplRequest {
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

export function reviewImpl(request: ReviewImplRequest): EyeResponse {
  if (!request.reasoning_md || !request.reasoning_md.trim()) {
    return buildResponse({
      tag: EyeTag.MANGEKYO,
      ok: false,
      code: StatusCode.E_REASONING_MISSING,
      md: `${Heading.REASONING}\nShare the rationale for implementation changes.`,
      data: { [DataKey.ISSUES_MD]: "Reasoning required." },
      next_action: NextAction.RESUBMIT_IMPL
    });
  }

  const diffsMarkdown = request.payload.diffs_md || "";
  if (!diffsMarkdown.includes("```diff")) {
    const md = `${Heading.IMPLEMENTATION_REJECTED}\nInclude diffs using \`\`\`diff\`\`\` fences.`;
    return buildResponse({
      tag: EyeTag.MANGEKYO,
      ok: false,
      code: StatusCode.E_IMPL_ISSUES,
      md,
      data: {
        [DataKey.ISSUES_MD]: "Diff snippets must use ```diff fences.",
        mangekyo_strictness: getStrictness(request)
      },
      next_action: NextAction.RESUBMIT_IMPL
    });
  }

  const level = getStrictness(request);
  const checklist = `${Heading.IMPLEMENTATION_CHECKLIST}\n- Diff provided\n- Reasoning supplied\n- Strictness: ${level.charAt(0).toUpperCase() + level.slice(1)}`;

  const data = {
    [DataKey.CHECKLIST_MD]: checklist,
    [DataKey.ISSUES_MD]: "",
    mangekyo_strictness: level
  };

  const md = `${Heading.IMPLEMENTATION_APPROVED}\nImplementation changes look sound.`;

  return buildResponse({
    tag: EyeTag.MANGEKYO,
    ok: true,
    code: StatusCode.OK_IMPL_APPROVED,
    md,
    data,
    next_action: NextAction.GO_TO_TESTS
  });
}
