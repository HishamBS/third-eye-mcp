import { z } from "zod";

/**
 * Provider Types - Unified API for all AI providers
 */

export type Role = "system" | "user" | "assistant";

/**
 * Model information and capabilities
 */
export const ModelInfoSchema = z.object({
  name: z.string(),
  family: z.string().optional(),
  capability: z
    .object({
      ctx: z.number().optional(),
      vision: z.boolean().optional(),
      jsonMode: z.boolean().optional(),
    })
    .optional(),
});

export type ModelInfo = z.infer<typeof ModelInfoSchema>;

/**
 * Completion request format
 */
export const CompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    }),
  ),
  maxNewTokens: z.number().optional(),
  sampling: z
    .object({
      temperature: z.number().optional(),
      top_p: z.number().optional(),
      top_k: z.number().optional(),
    })
    .optional(),
});

export type CompletionRequest = z.infer<typeof CompletionRequestSchema>;

/**
 * Tool call from function calling API
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
 * Completion response format
 * Matches the actual provider implementations in packages/providers/src/base.ts
 */
export const CompletionResponseSchema = z.object({
  id: z.string().optional(),
  model: z.string().optional(),
  content: z.string(),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number(),
      total_tokens: z.number(),
    })
    .optional(),
  finish_reason: z
    .enum(["stop", "length", "content_filter", "tool_calls"])
    .optional(),
  tool_calls: z.array(ToolCallSchema).optional(),
  // Legacy fields for backward compatibility
  tokensIn: z.number().optional(),
  tokensOut: z.number().optional(),
  latencyMs: z.number().optional(),
});

export type CompletionResponse = z.infer<typeof CompletionResponseSchema>;

/**
 * Provider health check response
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
  listModels(): Promise<ModelInfo[]>;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
  health(): Promise<HealthResponse>;
}

/**
 * Provider configuration
 */
export const ProviderConfigSchema = z.object({
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
      baseUrl: z.string().default("http://127.0.0.1:11434"), // Standard Ollama default port
    })
    .optional(),
  lmstudio: z
    .object({
      baseUrl: z.string().default("http://127.0.0.1:1234/v1"), // Standard LM Studio default port
    })
    .optional(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;
