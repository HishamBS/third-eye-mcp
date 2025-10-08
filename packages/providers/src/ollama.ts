import { z } from 'zod';
import { BaseProvider, type CompletionRequest, type CompletionResponse, type HealthStatus, type ModelInfo, type ProviderConfig } from './base.js';

const OllamaModelSchema = z.object({
  name: z.string(),
});

const OllamaModelsResponseSchema = z.object({
  models: z.array(OllamaModelSchema),
});

const OllamaCompletionResponseSchema = z.object({
  model: z.string(),
  message: z.object({ content: z.string() }),
  prompt_eval_count: z.number().optional(),
  eval_count: z.number().optional(),
  done: z.boolean().optional(),
});

export class OllamaProvider extends BaseProvider {
  private readonly baseUrl: string;

  constructor(config: ProviderConfig = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'http://127.0.0.1:11434',
    });
    this.baseUrl = this.config.baseUrl ?? 'http://127.0.0.1:11434';
  }

  get name(): string {
    return 'ollama';
  }

  get requiresApiKey(): boolean {
    return false;
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/api/tags`, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const payload = OllamaModelsResponseSchema.parse(await response.json());

      return payload.models.map(model => ({
        id: model.name,
        name: model.name,
        context_window: this.estimateContextWindow(model.name),
        pricing: undefined,
      }));
    } catch (error) {
      throw new Error(`Failed to list Ollama models: ${this.normalizeError(error)}`);
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream: false,
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.max_tokens,
            top_p: request.top_p,
            stop: request.stop,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama completion failed: ${errorText}`);
      }

      const payload = OllamaCompletionResponseSchema.parse(await response.json());
      const promptTokens = payload.prompt_eval_count ?? 0;
      const completionTokens = payload.eval_count ?? 0;

      return {
        id: `ollama-${Date.now()}`,
        model: payload.model,
        content: payload.message.content,
        usage: {
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: promptTokens + completionTokens,
        },
        finish_reason: this.normalizeFinishReason(payload.done === false ? 'length' : 'stop'),
      };
    } catch (error) {
      throw new Error(`Ollama completion error: ${this.normalizeError(error)}`);
    }
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/api/tags`, {
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
    if (modelName.includes('llama3')) return 8192;
    if (modelName.includes('mistral')) return 8192;
    if (modelName.includes('gemma')) return 8192;
    return 4096;
  }
}
