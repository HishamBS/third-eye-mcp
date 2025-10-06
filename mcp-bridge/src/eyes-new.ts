import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EyeOrchestrator } from "@third-eye/core";
import { launchPortal } from "./portal.js";

const orchestrator = new EyeOrchestrator();
const RESERVED_WRAPPER_KEYS = new Set(["signal", "_meta", "requestId", "progressToken", "arguments"]);

type SessionContext = {
  session_id: string;
  user_id: string | null;
  lang: "auto" | "en" | "ar";
  budget_tokens: number;
  tenant?: string | null;
};

let cachedContext: SessionContext | null = null;

function extractEnvelope(raw: Record<string, unknown>): Record<string, unknown> {
  let envelope: Record<string, unknown> = raw;
  if (raw && typeof raw.arguments === "object" && raw.arguments !== null) {
    envelope = raw.arguments as Record<string, unknown>;
  }
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(envelope)) {
    if (RESERVED_WRAPPER_KEYS.has(key)) continue;
    cleaned[key] = value;
  }
  return cleaned;
}

function ensureContext(): SessionContext {
  if (!cachedContext) {
    cachedContext = {
      session_id: `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      user_id: null,
      lang: "auto",
      budget_tokens: 0,
      tenant: null,
    };
  }
  return { ...cachedContext };
}

function coalesceContext(input: unknown): SessionContext {
  const base = ensureContext();
  if (!input || typeof input !== "object") {
    return base;
  }
  const raw = input as Record<string, unknown>;
  if (typeof raw.session_id === "string" && raw.session_id.trim()) {
    base.session_id = raw.session_id.trim();
  }
  if (typeof raw.user_id === "string" && raw.user_id.trim()) {
    base.user_id = raw.user_id.trim();
  } else if (raw.user_id === null) {
    base.user_id = null;
  }
  if (raw.lang === "en" || raw.lang === "ar" || raw.lang === "auto") {
    base.lang = raw.lang;
  }
  const numericBudget = Number(raw.budget_tokens);
  if (Number.isFinite(numericBudget) && numericBudget >= 0) {
    base.budget_tokens = numericBudget;
  }
  if (typeof raw.tenant === "string" && raw.tenant.trim()) {
    base.tenant = raw.tenant.trim();
  } else if (raw.tenant === null) {
    base.tenant = null;
  }
  return base;
}

async function executeEye(eyeName: string, input: string, body: Record<string, unknown>) {
  console.info(`[Third Eye MCP] Executing ${eyeName} with input: ${input.substring(0, 100)}...`);

  const envelope = extractEnvelope(body);
  const mergedContext = coalesceContext(envelope.context);
  cachedContext = mergedContext;

  // Get or create session
  let sessionId = mergedContext.session_id;
  if (!sessionId || sessionId.startsWith('sess-')) {
    const session = await orchestrator.createSession({
      agentName: 'MCP Agent',
      model: 'claude-3.5-sonnet',
    });
    sessionId = session.sessionId;
    cachedContext.session_id = sessionId;

    // Launch portal on first session creation
    launchPortal(sessionId, true);
    console.info(`[Third Eye MCP] Session created: ${sessionId}`);
    console.info(`[Third Eye MCP] Portal: ${session.portalUrl}`);
  }

  // Execute Eye
  const result = await orchestrator.runEye(eyeName, input, sessionId);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
    structuredContent: result,
  };
}

export function buildEyes(server: McpServer) {
  const contextSchema = {
    type: "object",
    properties: {
      session_id: { type: "string" },
      user_id: { type: ["string", "null"] },
      tenant: { type: ["string", "null"] },
      lang: { enum: ["auto", "en", "ar"] },
      budget_tokens: { type: "number", minimum: 0 },
    },
    required: ["session_id", "lang", "budget_tokens"],
    additionalProperties: false,
  } as const;

  const sharedEnvelope = (payloadSchema: Record<string, unknown>, reasoningRequired: boolean) => ({
    type: "object",
    properties: {
      context: contextSchema,
      payload: payloadSchema,
      reasoning_md: reasoningRequired
        ? { type: "string", minLength: 1 }
        : { type: ["string", "null"], minLength: 1 },
    },
    required: reasoningRequired ? ["context", "payload", "reasoning_md"] : ["context", "payload"],
    additionalProperties: false,
  });

  // Sharingan - Ambiguity detection
  server.tool(
    "sharingan/clarify",
    {
      inputSchema: sharedEnvelope(
        {
          type: "object",
          properties: {
            prompt: { type: "string", minLength: 1 },
          },
          required: ["prompt"],
          additionalProperties: false,
        },
        false,
      ),
    },
    async (args) => {
      const envelope = extractEnvelope(args as Record<string, unknown>);
      const prompt = (envelope.payload as any)?.prompt || '';
      return executeEye("sharingan", prompt, args as Record<string, unknown>);
    },
  );

  // Prompt Helper - Optimize prompts
  server.tool(
    "helper/rewrite_prompt",
    {
      inputSchema: sharedEnvelope(
        {
          type: "object",
          properties: {
            user_prompt: { type: "string", minLength: 1 },
            clarification_answers_md: { type: "string" },
          },
          required: ["user_prompt"],
          additionalProperties: false,
        },
        false,
      ),
    },
    async (args) => {
      const envelope = extractEnvelope(args as Record<string, unknown>);
      const payload = envelope.payload as any;
      const input = payload.clarification_answers_md
        ? `${payload.user_prompt}\n\nClarifications: ${payload.clarification_answers_md}`
        : payload.user_prompt;
      return executeEye("prompt-helper", input, args as Record<string, unknown>);
    },
  );

  // Jōgan - Intent analysis
  server.tool(
    "jogan/confirm_intent",
    {
      inputSchema: sharedEnvelope(
        {
          type: "object",
          properties: {
            refined_prompt_md: { type: "string", minLength: 1 },
            estimated_tokens: { type: "number", minimum: 0 },
          },
          required: ["refined_prompt_md"],
          additionalProperties: false,
        },
        false,
      ),
    },
    async (args) => {
      const envelope = extractEnvelope(args as Record<string, unknown>);
      const prompt = (envelope.payload as any)?.refined_prompt_md || '';
      return executeEye("jogan", prompt, args as Record<string, unknown>);
    },
  );

  // Rinnegan - Plan validation
  server.tool(
    "rinnegan/plan_review",
    {
      inputSchema: sharedEnvelope(
        {
          type: "object",
          properties: {
            submitted_plan_md: { type: "string", minLength: 1 },
          },
          required: ["submitted_plan_md"],
          additionalProperties: false,
        },
        true,
      ),
    },
    async (args) => {
      const envelope = extractEnvelope(args as Record<string, unknown>);
      const plan = (envelope.payload as any)?.submitted_plan_md || '';
      return executeEye("rinnegan", plan, args as Record<string, unknown>);
    },
  );

  // Mangekyō - Code review (combined gate)
  server.tool(
    "mangekyo/review_code",
    {
      inputSchema: sharedEnvelope(
        {
          type: "object",
          properties: {
            code_md: { type: "string", minLength: 1 },
            diffs_md: { type: "string" },
          },
          required: ["code_md"],
          additionalProperties: false,
        },
        true,
      ),
    },
    async (args) => {
      const envelope = extractEnvelope(args as Record<string, unknown>);
      const payload = envelope.payload as any;
      const input = payload.diffs_md
        ? `${payload.code_md}\n\n## Diffs:\n${payload.diffs_md}`
        : payload.code_md;
      return executeEye("mangekyo", input, args as Record<string, unknown>);
    },
  );

  // Tenseigan - Evidence validation
  server.tool(
    "tenseigan/validate_claims",
    {
      inputSchema: sharedEnvelope(
        {
          type: "object",
          properties: {
            draft_md: { type: "string", minLength: 1 },
          },
          required: ["draft_md"],
          additionalProperties: false,
        },
        true,
      ),
    },
    async (args) => {
      const envelope = extractEnvelope(args as Record<string, unknown>);
      const draft = (envelope.payload as any)?.draft_md || '';
      return executeEye("tenseigan", draft, args as Record<string, unknown>);
    },
  );

  // Byakugan - Consistency check
  server.tool(
    "byakugan/consistency_check",
    {
      inputSchema: sharedEnvelope(
        {
          type: "object",
          properties: {
            topic: { type: "string", minLength: 1 },
            draft_md: { type: "string", minLength: 1 },
          },
          required: ["topic", "draft_md"],
          additionalProperties: false,
        },
        true,
      ),
    },
    async (args) => {
      const envelope = extractEnvelope(args as Record<string, unknown>);
      const payload = envelope.payload as any;
      const input = `Topic: ${payload.topic}\n\n${payload.draft_md}`;
      return executeEye("byakugan", input, args as Record<string, unknown>);
    },
  );

  // Final approval (uses all Eye results)
  server.tool(
    "rinnegan/final_approval",
    {
      inputSchema: sharedEnvelope(
        {
          type: "object",
          properties: {
            plan_approved: { type: "boolean" },
            code_approved: { type: "boolean" },
            evidence_validated: { type: "boolean" },
            consistent: { type: "boolean" },
          },
          required: ["plan_approved", "code_approved", "evidence_validated", "consistent"],
          additionalProperties: false,
        },
        false,
      ),
    },
    async (args) => {
      const envelope = extractEnvelope(args as Record<string, unknown>);
      const payload = envelope.payload as any;
      const summary = `Final approval check:
- Plan approved: ${payload.plan_approved}
- Code approved: ${payload.code_approved}
- Evidence validated: ${payload.evidence_validated}
- Consistent: ${payload.consistent}`;

      // Use Rinnegan for final approval
      return executeEye("rinnegan", summary, args as Record<string, unknown>);
    },
  );
}
