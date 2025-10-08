import { z } from 'zod';
import { BaseProvider, type CompletionRequest, type CompletionResponse, type HealthStatus, type ModelInfo, type ProviderConfig } from './base.js';

const GroqModelSchema = z.object({
  id: z.string(),
  active: z.boolean().optional(),
  context_window: z.number().optional(),
});

const GroqModelsResponseSchema = z.object({
  data: z.array(GroqModelSchema),
});

const GroqChoiceSchema = z.object({
  message: z.object({ content: z.string() }),
  finish_reason: z.string().optional().nullable(),
});

const GroqUsageSchema = z.object({
  prompt_tokens: z.number().optional(),
  completion_tokens: z.number().optional(),
  total_tokens: z.number().optional(),
}).optional();

const GroqCompletionResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  choices: z.array(GroqChoiceSchema).min(1),
  usage: GroqUsageSchema,
});

export class GroqProvider extends BaseProvider {
  private readonly baseUrl = 'https://api.groq.com/openai/v1';

  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://api.groq.com/openai/v1'
    });
  }

  get name(): string {
    return 'groq';
  }

  get requiresApiKey(): boolean {
    return true;
  }

  async listModels(): Promise<ModelInfo[]> {
    if (!this.config.apiKey) {
      throw new Error('Groq API key required');
    }

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/models`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = GroqModelsResponseSchema.parse(await response.json());

      return data.data
        .filter(model => model.active !== false)
        .map(model => ({
          id: model.id,
          name: model.id,
          context_window: model.context_window ?? 32768,
          pricing: this.getPricing(model.id)
        }));
    } catch (error) {
      throw new Error(`Failed to list Groq models: ${this.normalizeError(error)}`);
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.config.apiKey) {
      throw new Error('Groq API key required');
    }

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: request.model,
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.max_tokens,
            top_p: request.top_p,
            stop: request.stop,
            response_format: request.response_format
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq completion failed: ${error}`);
      }

      const data = GroqCompletionResponseSchema.parse(await response.json());
      const usage = data.usage ?? {};
      const primaryChoice = data.choices[0];

      return {
        id: data.id,
        model: data.model,
        content: primaryChoice.message.content,
        usage: {
          prompt_tokens: usage.prompt_tokens ?? 0,
          completion_tokens: usage.completion_tokens ?? 0,
          total_tokens: usage.total_tokens ?? 0,
        },
        finish_reason: this.normalizeFinishReason(primaryChoice.finish_reason),
      };
    } catch (error) {
      throw new Error(`Groq completion error: ${this.normalizeError(error)}`);
    }
  }

  async health(): Promise<HealthStatus> {
    if (!this.config.apiKey) {
      return {
        healthy: false,
        error: 'API key not configured'
      };
    }

    const start = Date.now();

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/models`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        healthy: response.ok,
        latency_ms: Date.now() - start,
        error: response.ok ? undefined : `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        healthy: false,
        latency_ms: Date.now() - start,
        error: this.normalizeError(error)
      };
    }
  }

  private getPricing(modelId: string): { prompt: number; completion: number } | undefined {
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'llama-3.3-70b-versatile': { prompt: 0.59, completion: 0.79 },
      'llama-3.1-70b-versatile': { prompt: 0.59, completion: 0.79 },
      'llama-3.1-8b-instant': { prompt: 0.05, completion: 0.08 },
      'mixtral-8x7b-32768': { prompt: 0.24, completion: 0.24 },
      'gemma2-9b-it': { prompt: 0.20, completion: 0.20 }
    };

    return pricing[modelId];
  }
}
