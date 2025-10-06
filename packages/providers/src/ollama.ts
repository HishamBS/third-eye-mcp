import { BaseProvider, type CompletionRequest, type CompletionResponse, type HealthStatus, type ModelInfo, type ProviderConfig } from './base.js';

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  details: {
    parameter_size: string;
    quantization_level: string;
  };
}

export class OllamaProvider extends BaseProvider {
  private readonly baseUrl: string;

  constructor(config: ProviderConfig = {}) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'http://127.0.0.1:11434'
    });
    this.baseUrl = this.config.baseUrl!;
  }

  get name(): string {
    return 'ollama';
  }

  get requiresApiKey(): boolean {
    return false;
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/api/tags`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json() as { models: OllamaModel[] };

      return data.models.map(m => ({
        id: m.name,
        name: m.name,
        context_window: this.estimateContextWindow(m.name),
        // Local models have no pricing
        pricing: undefined
      }));
    } catch (error) {
      throw new Error(`Failed to list Ollama models: ${this.normalizeError(error)}`);
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/api/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: request.model,
            messages: request.messages,
            stream: false,
            options: {
              temperature: request.temperature ?? 0.7,
              num_predict: request.max_tokens,
              top_p: request.top_p,
              stop: request.stop
            }
          })
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Ollama completion failed: ${error}`);
      }

      const data = await response.json();

      return {
        id: `ollama-${Date.now()}`,
        model: data.model,
        content: data.message.content,
        usage: {
          prompt_tokens: data.prompt_eval_count || 0,
          completion_tokens: data.eval_count || 0,
          total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
        },
        finish_reason: data.done ? 'stop' : 'length'
      };
    } catch (error) {
      throw new Error(`Ollama completion error: ${this.normalizeError(error)}`);
    }
  }

  async health(): Promise<HealthStatus> {
    const start = Date.now();

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/api/tags`,
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
    if (modelName.includes('llama3')) return 8192;
    if (modelName.includes('mistral')) return 8192;
    if (modelName.includes('gemma')) return 8192;
    return 4096; // Default
  }
}
