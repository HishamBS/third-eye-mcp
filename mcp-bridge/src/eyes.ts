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

const API_KEY = process.env.THIRD_EYE_API_KEY ?? "";
if (!API_KEY) {
  console.warn(
    "[Third Eye MCP] THIRD_EYE_API_KEY is not set; API calls will be rejected with 401 until you configure it.",
  );
}

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

async function callEye(eyeName: string, input: string, body: Record<string, unknown>) {
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

  // Execute Eye (100% AI-powered, no rule-based)
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

  server.tool(
    "overseer/navigator",
    {
      inputSchema: {
        type: "object",
        properties: {
          context: {
            anyOf: [contextSchema, { type: "null" }],
          },
          payload: {
            type: "object",
            properties: {
              request_md: { type: "string" },
            },
            additionalProperties: false,
          },
          reasoning_md: { type: ["string", "null"], minLength: 1 },
        },
        required: ["payload"],
        additionalProperties: false,
      },
    },
    async (args) => {
      const envelope = extractEnvelope(args as Record<string, unknown>);
      const requestMd = (envelope.payload as any)?.request_md || '';
      return callEye("overseer", requestMd, args as Record<string, unknown>);
    },
  );

  server.tool(
    "sharingan/clarify",
    {
      inputSchema: sharedEnvelope(
        {
          type: "object",
          properties: {
            prompt: { type: "string", minLength: 1 },
            lang: { enum: ["auto", "en", "ar"] },
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
      return callEye("sharingan", prompt, args as Record<string, unknown>);
    },
  );

  server.tool(
    "helper/rewrite_prompt",
    {
      inputSchema: sharedEnvelope(
        {
          type: "object",
          properties: {
            user_prompt: { type: "string", minLength: 1 },
            clarification_answers_md: { type: "string", minLength: 1 },
          },
          required: ["user_prompt", "clarification_answers_md"],
          additionalProperties: false,
        },
        false,
      ),
    },
    async (args) => callEye("/eyes/helper/rewrite_prompt", args as Record<string, unknown>),
  );

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
          required: ["refined_prompt_md", "estimated_tokens"],
          additionalProperties: false,
        },
        false,
      ),
    },
    async (args) => callEye("/eyes/jogan/confirm_intent", args as Record<string, unknown>),
  );

  server.tool(
    "rinnegan/plan_requirements",
    {
      inputSchema: sharedEnvelope(
        {
          type: "object",
          properties: {
            summary_md: { type: "string" },
          },
          additionalProperties: false,
        },
        false,
      ),
    },
    async (args) => callEye("/eyes/rinnegan/plan_requirements", args as Record<string, unknown>),
  );

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
    async (args) => callEye("/eyes/rinnegan/plan_review", args as Record<string, unknown>),
  );

  const mangekyoDiffSchema = {
    type: "object",
    properties: {
      diffs_md: { type: "string", minLength: 1 },
    },
    required: ["diffs_md"],
    additionalProperties: false,
  } as const;

  server.tool(
    "mangekyo/review_scaffold",
    {
      inputSchema: sharedEnvelope(
        {
          type: "object",
          properties: {
            files: {
              type: "array",
              minItems: 1,
              items: {
                type: "object",
                properties: {
                  path: { type: "string", minLength: 1 },
                  intent: { enum: ["create", "modify", "delete"] },
                  reason: { type: "string", minLength: 1 },
                },
                required: ["path", "intent", "reason"],
                additionalProperties: false,
              },
            },
          },
          required: ["files"],
          additionalProperties: false,
        },
        true,
      ),
    },
    async (args) => callEye("/eyes/mangekyo/review_scaffold", args as Record<string, unknown>),
  );

  server.tool(
    "mangekyo/review_impl",
    {
      inputSchema: sharedEnvelope(mangekyoDiffSchema, true),
    },
    async (args) => callEye("/eyes/mangekyo/review_impl", args as Record<string, unknown>),
  );

  server.tool(
    "mangekyo/review_tests",
    {
      inputSchema: sharedEnvelope(
        {
          type: "object",
          properties: {
            diffs_md: { type: "string", minLength: 1 },
            coverage_summary_md: { type: "string", minLength: 1 },
          },
          required: ["diffs_md", "coverage_summary_md"],
          additionalProperties: false,
        },
        true,
      ),
    },
    async (args) => callEye("/eyes/mangekyo/review_tests", args as Record<string, unknown>),
  );

  server.tool(
    "mangekyo/review_docs",
    {
      inputSchema: sharedEnvelope(mangekyoDiffSchema, true),
    },
    async (args) => callEye("/eyes/mangekyo/review_docs", args as Record<string, unknown>),
  );

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
    async (args) => callEye("/eyes/tenseigan/validate_claims", args as Record<string, unknown>),
  );

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
    async (args) => callEye("/eyes/byakugan/consistency_check", args as Record<string, unknown>),
  );

  server.tool(
    "rinnegan/final_approval",
    {
      inputSchema: sharedEnvelope(
        {
          type: "object",
          properties: {
            plan_approved: { type: "boolean" },
            scaffold_approved: { type: "boolean" },
            impl_approved: { type: "boolean" },
            tests_approved: { type: "boolean" },
            docs_approved: { type: "boolean" },
            text_validated: { type: "boolean" },
            consistent: { type: "boolean" },
          },
          required: [
            "plan_approved",
            "scaffold_approved",
            "impl_approved",
            "tests_approved",
            "docs_approved",
            "text_validated",
            "consistent",
          ],
          additionalProperties: false,
        },
        false,
      ),
    },
    async (args) => callEye("/eyes/rinnegan/final_approval", args as Record<string, unknown>),
  );
}
