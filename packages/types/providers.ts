import { z } from "zod";

/**
 * Provider Types - Unified API for all AI providers
 *
 * SSOT: This file is the single source of truth for all provider-level types.
 * packages/providers/src/base.ts MUST import from here.
 * packages/types/interfaces.ts MUST NOT duplicate these definitions.
 */

export type Role = "system" | "user" | "assistant";

/**
 * Function tool definition for function calling
 */
export interface FunctionTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

/**
 * Tool call response from model
 */
export const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

/**
 * Model information and capabilities (provider-level)
 *
 * This represents a model as returned by a provider's listModels() endpoint.
 * For the app-level model representation (with provider, displayName, lastSeen),
 * see ModelInfo in interfaces.ts.
 */
export const ProviderModelInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  context_window: z.number().optional(),
  family: z.string().optional(),
  capability: z
    .object({
      ctx: z.number().optional(),
      vision: z.boolean().optional(),
      jsonMode: z.boolean().optional(),
    })
    .optional(),
  pricing: z
    .object({
      prompt: z.number(), // per 1M tokens
      completion: z.number(), // per 1M tokens
    })
    .optional(),
});

export type ProviderModelInfo = z.infer<typeof ProviderModelInfoSchema>;

/**
 * Provider configuration
 */
export const ProviderConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  timeout: z.number().optional(), // milliseconds
  maxRetries: z.number().optional(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

/**
 * Completion request format (provider-level)
 *
 * Supports function calling (tools/tool_choice) for compatible models.
 */
export const CompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    }),
  ),
  temperature: z.number().optional(),
  max_tokens: z.number().optional(),
  top_p: z.number().optional(),
  stop: z.array(z.string()).optional(),
  response_format: z
    .object({
      type: z.enum(["json_object", "text"]),
    })
    .optional(),
  // Function calling support
  tools: z.array(z.unknown()).optional(),
  tool_choice: z
    .union([
      z.enum(["auto", "none", "required"]),
      z.object({
        type: z.literal("function"),
        function: z.object({ name: z.string() }),
      }),
    ])
    .optional(),
});

export type CompletionRequest = z.infer<typeof CompletionRequestSchema>;

/**
 * Completion response format
 */
export const CompletionResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  content: z.string(),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
  finish_reason: z
    .enum(["stop", "length", "content_filter", "tool_calls"])
    .optional(),
  tool_calls: z.array(ToolCallSchema).optional(),
});

export type CompletionResponse = z.infer<typeof CompletionResponseSchema>;

/**
 * Provider health check response (provider-level)
 */
export interface HealthStatus {
  healthy: boolean;
  latency_ms?: number;
  error?: string;
}

/**
 * Provider health check response (Zod schema for API responses)
 */
export const HealthResponseSchema = z.object({
  ok: z.boolean(),
  details: z.any().optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/**
 * Provider client interface
 */
export interface ProviderClient {
  listModels(): Promise<ProviderModelInfo[]>;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
  health(): Promise<HealthResponse>;
}

/**
 * Provider endpoint configuration (Zod schema)
 *
 * NOTE: Base URLs are imported from @third-eye/config PROVIDER_BASE_URLS
 * for the actual defaults. These schema defaults serve as Zod parse fallbacks.
 */
export const ProviderEndpointConfigSchema = z.object({
  groq: z
    .object({
      baseUrl: z.string().default("https://api.groq.com/openai/v1"),
      apiKey: z.string().optional(),
    })
    .optional(),
  openrouter: z
    .object({
      baseUrl: z.string().default("https://openrouter.ai/api/v1"),
      apiKey: z.string().optional(),
    })
    .optional(),
  ollama: z
    .object({
      baseUrl: z.string().default("http://127.0.0.1:11434"),
    })
    .optional(),
  lmstudio: z
    .object({
      baseUrl: z.string().default("http://127.0.0.1:1234/v1"),
    })
    .optional(),
});

export type ProviderEndpointConfig = z.infer<
  typeof ProviderEndpointConfigSchema
>;
