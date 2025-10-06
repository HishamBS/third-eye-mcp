import {
  EyeTag,
  StatusCode,
  NextAction,
  Heading,
  DataKey
} from "./constants";
import { buildResponse } from "./shared";
import type { EyeResponse } from "./constants";

function sanitizeLines(markdown: string): string[] {
  return markdown
    .split("\n")
    .map(line => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

function buildPromptMarkdown(userPrompt: string, clarificationsMarkdown: string): string {
  const clarifications = sanitizeLines(clarificationsMarkdown);
  const contextSection = clarifications.length > 0
    ? clarifications.map(line => `- ${line}`).join("\n")
    : "- No additional clarifications supplied.";

  return `### Optimized Prompt
ROLE: Host analyst acting on behalf of the requester
TASK: ${userPrompt.trim()}
CONTEXT:
${contextSection}
REQUIREMENTS:
- Follow the clarified constraints and cite sources when appropriate.
OUTPUT:
- Deliverable that satisfies the clarified intent with actionable detail.`.trim();
}

export interface HelperRequest {
  payload: {
    user_prompt: string;
    clarification_answers_md: string;
  };
}

export function rewritePrompt(request: HelperRequest): EyeResponse {
  const userPrompt = request.payload.user_prompt.trim();
  const clarificationsMarkdown = request.payload.clarification_answers_md.trim();

  const promptMarkdown = buildPromptMarkdown(userPrompt, clarificationsMarkdown);

  const data = {
    [DataKey.PROMPT_MD]: promptMarkdown,
    [DataKey.NEXT_ACTION_MD]: `${Heading.NEXT_ACTION}\n${NextAction.SEND_TO_JOGAN}`
  };

  const md = `${Heading.PROMPT_READY}\nPrompt ready for confirmation.`;

  return buildResponse({
    tag: EyeTag.PROMPT_HELPER,
    ok: true,
    code: StatusCode.OK_PROMPT_READY,
    md,
    data,
    next_action: NextAction.SEND_TO_JOGAN
  });
}
