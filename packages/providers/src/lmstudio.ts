import { BaseProvider, type CompletionRequest, type CompletionResponse, type HealthStatus, type ModelInfo, type ProviderConfig } from './base.js';

interface LMStudioModel {
  id: string;
  object: string;
  owned_by: string;
}

export class LMStudioProvider extends BaseProvider {
  private readonly baseUrl: string;

  constructor(config: ProviderConfig = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'http://127.0.0.1:1234/v1'
    });
    this.baseUrl = this.config.baseUrl!;
  }

  get name(): string {
    return 'lmstudio';
  }

  get requiresApiKey(): boolean {
    return false;
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/models`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status}`);
      }

      const data = await response.json() as { data: LMStudioModel[] };

      return data.data.map(m => ({
        id: m.id,
        name: m.id,
        context_window: this.estimateContextWindow(m.id),
        // Local models have no pricing
        pricing: undefined
      }));
    } catch (error) {
      throw new Error(`Failed to list LM Studio models: ${this.normalizeError(error)}`);
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: request.model,
            messages: request.messages,
            temperature: request.temperature ?? 0.7,
            max_tokens: request.max_tokens,
            top_p: request.top_p,
            stop: request.stop
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LM Studio completion failed: ${error}`);
      }

      const data = await response.json();

      return {
        id: data.id || `lmstudio-${Date.now()}`,
        model: data.model,
        content: data.choices[0].message.content,
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0
        },
        finish_reason: data.choices[0].finish_reason || 'stop'
      };
    } catch (error) {
      throw new Error(`LM Studio completion error: ${this.normalizeError(error)}`);
    }
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/models`,
        {
          headers: {
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

  private estimateContextWindow(modelName: string): number {
    // Estimate context window based on model name
    if (modelName.includes('32k')) return 32768;
    if (modelName.includes('16k')) return 16384;
    if (modelName.includes('8k')) return 8192;
    if (modelName.includes('llama')) return 8192;
    if (modelName.includes('mistral')) return 8192;
    if (modelName.includes('gemma')) return 8192;
    return 4096; // Default
  }
}
