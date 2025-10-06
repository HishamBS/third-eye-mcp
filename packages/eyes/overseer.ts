import { EyeTag, StatusCode, NextAction } from "./constants";
import { buildResponse } from "./shared";
import type { EyeResponse } from "./constants";

const OVERSEER_INTRO = `### Overseer Introduction
Third Eye MCP is an Overseer. Host agents own all deliverables. This navigator is the required entry point; no other eye will respond until it runs.`;

const PIPELINE_OVERVIEW = `### Next Steps
- The MCP bridge auto-populates session context; clients only send payload (and reasoning when required).
- Call sharingan/clarify to score ambiguity and gather questions.
- Use helper/rewrite_prompt to engineer a ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT brief.
- Run jogan/confirm_intent to ensure scope and token budgets are approved.
- Follow the Code branch (Rinnegan + Mangekyō phases) for implementation work.
- Follow the Text branch (Rinnegan -> Tenseigan -> Byakugan) for factual or narrative work.
- Finish with rinnegan/final_approval once every gate returns ok=true.`;

export interface OverseerRequest {
  payload?: {
    goal?: string;
  };
  context?: {
    session_id?: string;
    user_id?: string;
    lang?: string;
    budget_tokens?: number;
  };
}

export function navigator(request: OverseerRequest): EyeResponse {
  const goal = request.payload?.goal;
  const summaryLines = [OVERSEER_INTRO];

  if (goal) {
    summaryLines.push(`Goal noted: \`${goal}\`. Overseer will guide; host model must produce deliverables.`);
  }

  const md = summaryLines.join("\n");

  const sessionId = request.context?.session_id || `sess-${Date.now().toString(16)}`;

  const data = {
    summary_md: md,
    instructions_md: PIPELINE_OVERVIEW,
    session_id: sessionId,
    next_action_md: `### Next Action\nBEGIN_WITH_SHARINGAN`
  };

  return buildResponse({
    tag: EyeTag.OVERSEER,
    ok: true,
    code: StatusCode.OK_NO_CLARIFICATION_NEEDED,
    md,
    data,
    next_action: NextAction.ASK_CLARIFICATIONS
  });
}
