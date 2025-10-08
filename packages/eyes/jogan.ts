import {
  EyeTag,
  StatusCode,
  NextAction,
  Heading,
  DataKey
} from "./constants";
import { buildResponse } from "./shared";
import type { EyeResponse } from "./constants";
import { MarkdownBuilder } from "./utils/markdown-builder";

function missingSections(markdown: string): string[] {
  const sections = ["ROLE:", "TASK:", "CONTEXT:", "REQUIREMENTS:", "OUTPUT:"];
  const upper = markdown.toUpperCase();
  return sections
    .filter(section => !upper.includes(section))
    .map(section => section.replace(":", ""));
}

export interface JoganRequest {
  payload: {
    refined_prompt_md: string;
    estimated_tokens: number;
  };
}

export function confirmIntent(request: JoganRequest): EyeResponse {
  const promptMarkdown = request.payload.refined_prompt_md.trim();
  const missing = missingSections(promptMarkdown);
  const estimatedTokens = request.payload.estimated_tokens;

  const data = {
    [DataKey.INTENT_CONFIRMED]: false,
    [DataKey.ISSUES_MD]: ""
  };

  if (missing.length > 0) {
    const issuesMessage = `Missing sections: ${missing.join(", ")}.`;
    const issueMarkdown = MarkdownBuilder.create()
      .heading(Heading.INTENT_NOT_CONFIRMED)
      .text(issuesMessage)
      .build();
    data[DataKey.ISSUES_MD] = issueMarkdown;

    return buildResponse({
      tag: EyeTag.JOGAN,
      ok: false,
      code: StatusCode.E_INTENT_UNCONFIRMED,
      md: issueMarkdown,
      data,
      next_action: NextAction.RERUN_JOGAN
    });
  }

  if (estimatedTokens <= 0) {
    const issuesMessage = "Estimated token count must be greater than zero.";
    const issueMarkdown = MarkdownBuilder.create()
      .heading(Heading.INTENT_NOT_CONFIRMED)
      .text(issuesMessage)
      .build();
    data[DataKey.ISSUES_MD] = issueMarkdown;

    return buildResponse({
      tag: EyeTag.JOGAN,
      ok: false,
      code: StatusCode.E_INTENT_UNCONFIRMED,
      md: issueMarkdown,
      data,
      next_action: NextAction.RERUN_JOGAN
    });
  }

  data[DataKey.INTENT_CONFIRMED] = true;
  data[DataKey.ISSUES_MD] = "";
  const md = MarkdownBuilder.create()
    .heading(Heading.INTENT_CONFIRMED)
    .text("Prompt structure looks complete.")
    .build();

  return buildResponse({
    tag: EyeTag.JOGAN,
    ok: true,
    code: StatusCode.OK_INTENT_CONFIRMED,
    md,
    data,
    next_action: NextAction.CALL_PLAN_REQUIREMENTS
  });
}
