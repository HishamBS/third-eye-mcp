import { z } from 'zod';
import { BaseProvider, type CompletionRequest, type CompletionResponse, type HealthStatus, type ModelInfo, type ProviderConfig } from './base.js';

const LMStudioModelSchema = z.object({
  id: z.string(),
});

const LMStudioModelsResponseSchema = z.object({
  data: z.array(LMStudioModelSchema),
});

const LMStudioChoiceSchema = z.object({
  message: z.object({ content: z.string() }),
  finish_reason: z.string().optional().nullable(),
});

const LMStudioUsageSchema = z.object({
  prompt_tokens: z.number().optional(),
  completion_tokens: z.number().optional(),
  total_tokens: z.number().optional(),
}).optional();

const LMStudioCompletionResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  choices: z.array(LMStudioChoiceSchema).min(1),
  usage: LMStudioUsageSchema,
});

export class LMStudioProvider extends BaseProvider {
  private readonly baseUrl: string;

  constructor(config: ProviderConfig = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'http://127.0.0.1:1234/v1',
    });
    this.baseUrl = this.config.baseUrl ?? 'http://127.0.0.1:1234/v1';
  }

  get name(): string {
    return 'lmstudio';
  }

  get requiresApiKey(): boolean {
    return false;
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/models`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status}`);
      }

      const payload = LMStudioModelsResponseSchema.parse(await response.json());

      return payload.data.map(model => ({
        id: model.id,
        name: model.id,
        context_window: this.estimateContextWindow(model.id),
        pricing: undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to list LM Studio models: ${this.normalizeError(error)}`);
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error(`LM Studio completion failed: ${errorText}`);
      }

      const payload = LMStudioCompletionResponseSchema.parse(await response.json());
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
      throw new Error(`LM Studio completion error: ${this.normalizeError(error)}`);
    }
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/models`, {
        headers: { 'Content-Type': 'application/json' },
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

  private estimateContextWindow(modelName: string): number {
    if (modelName.includes('32k')) return 32768;
    if (modelName.includes('16k')) return 16384;
    if (modelName.includes('8k')) return 8192;
    if (modelName.includes('llama')) return 8192;
    if (modelName.includes('mistral')) return 8192;
    if (modelName.includes('gemma')) return 8192;
    return 4096;
  }
}
