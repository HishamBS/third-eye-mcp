import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fetch from "node-fetch";

const API_URL = process.env.API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

const contextSchema = {
  type: "object",
  properties: {
    session_id: { type: "string" },
    user_id: { type: ["string", "null"] },
    lang: { enum: ["auto", "en", "ar"] },
    budget_tokens: { type: "number", minimum: 0 },
  },
  required: ["session_id", "lang", "budget_tokens"],
  additionalProperties: false,
} as const;

async function callEye(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Eye request failed (${response.status}): ${text}`);
  }
  const payload = (await response.json()) as Record<string, unknown>;
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
    structuredContent: payload,
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
              goal: { type: "string" },
            },
            additionalProperties: false,
          },
          reasoning_md: { type: ["string", "null"], minLength: 1 },
        },
        required: [],
        additionalProperties: false,
      },
    },
    async (args) => callEye("/eyes/overseer/navigator", args as Record<string, unknown>),
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
    async (args) => callEye("/eyes/sharingan/clarify", args as Record<string, unknown>),
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
