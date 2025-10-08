import { z } from 'zod';
import { BaseProvider, type CompletionRequest, type CompletionResponse, type HealthStatus, type ModelInfo, type ProviderConfig } from './base.js';

const OpenRouterModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  pricing: z.object({
    prompt: z.string(),
    completion: z.string(),
  }),
  context_length: z.number().optional(),
});

const OpenRouterModelsResponseSchema = z.object({
  data: z.array(OpenRouterModelSchema),
});

const OpenRouterChoiceSchema = z.object({
  message: z.object({ content: z.string() }),
  finish_reason: z.string().optional().nullable(),
});

const OpenRouterUsageSchema = z.object({
  prompt_tokens: z.number().optional(),
  completion_tokens: z.number().optional(),
  total_tokens: z.number().optional(),
}).optional();

const OpenRouterCompletionResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  choices: z.array(OpenRouterChoiceSchema).min(1),
  usage: OpenRouterUsageSchema,
});

export class OpenRouterProvider extends BaseProvider {
  private readonly baseUrl = 'https://openrouter.ai/api/v1';

  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://openrouter.ai/api/v1',
    });
  }

  get name(): string {
    return 'openrouter';
  }

  get requiresApiKey(): boolean {
    return true;
  }

  async listModels(): Promise<ModelInfo[]> {
    if (!this.config.apiKey) {
      throw new Error('OpenRouter API key required');
    }

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const payload = OpenRouterModelsResponseSchema.parse(await response.json());

      return payload.data.map(model => ({
        id: model.id,
        name: model.name,
        context_window: model.context_length ?? 8192,
        pricing: {
          prompt: parseFloat(model.pricing.prompt) * 1_000_000,
          completion: parseFloat(model.pricing.completion) * 1_000_000,
        },
      }));
    } catch (error) {
      throw new Error(`Failed to list OpenRouter models: ${this.normalizeError(error)}`);
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.config.apiKey) {
      throw new Error('OpenRouter API key required');
    }

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://third-eye-mcp.local',
          'X-Title': 'Third Eye MCP',
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.max_tokens,
          top_p: request.top_p,
          stop: request.stop,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter completion failed: ${errorText}`);
      }

      const payload = OpenRouterCompletionResponseSchema.parse(await response.json());
      const usage = payload.usage ?? {};
      const choice = payload.choices[0];

      return {
        id: payload.id,
        model: payload.model,
        content: choice.message.content,
        usage: {
          prompt_tokens: usage.prompt_tokens ?? 0,
          completion_tokens: usage.completion_tokens ?? 0,
          total_tokens: usage.total_tokens ?? 0,
        },
        finish_reason: this.normalizeFinishReason(choice.finish_reason),
      };
    } catch (error) {
      throw new Error(`OpenRouter completion error: ${this.normalizeError(error)}`);
    }
  }

  async health(): Promise<HealthStatus> {
    if (!this.config.apiKey) {
      return {
        healthy: false,
        error: 'API key not configured',
      };
    }

    const start = Date.now();

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        healthy: response.ok,
        latency_ms: Date.now() - start,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        healthy: false,
        latency_ms: Date.now() - start,
        error: this.normalizeError(error),
      };
    }
  }
}
