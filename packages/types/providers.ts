import { z } from 'zod';
import { ProviderId } from './enums';

/**
 * Provider Types - Unified API for all AI providers
 */

export type Role = 'system' | 'user' | 'assistant';

/**
 * Model information and capabilities
 */
export const ModelInfoSchema = z.object({
  name: z.string(),
  family: z.string().optional(),
  capability: z.object({
    ctx: z.number().optional(),
    vision: z.boolean().optional(),
    jsonMode: z.boolean().optional(),
  }).optional(),
});

export type ModelInfo = z.infer<typeof ModelInfoSchema>;

/**
 * Completion request format
 */
export const CompletionRequestSchema = z.object({
  model: z.string(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })),
  maxNewTokens: z.number().optional(),
  sampling: z.object({
    temperature: z.number().optional(),
    top_p: z.number().optional(),
    top_k: z.number().optional(),
  }).optional(),
});

export type CompletionRequest = z.infer<typeof CompletionRequestSchema>;

/**
 * Completion response format
 */
export const CompletionResponseSchema = z.object({
  text: z.string(),
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
  groq: z.object({
    baseUrl: z.string().default('https://api.groq.com/openai/v1'),
    apiKey: z.string().optional(),
  }).optional(),
  openrouter: z.object({
    baseUrl: z.string().default('https://openrouter.ai/api/v1'),
    apiKey: z.string().optional(),
  }).optional(),
  ollama: z.object({
    baseUrl: z.string().default('http://127.0.0.1:11434'),
  }).optional(),
  lmstudio: z.object({
    baseUrl: z.string().default('http://127.0.0.1:1234'),
  }).optional(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;