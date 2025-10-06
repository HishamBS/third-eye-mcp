import { BaseProvider, type CompletionRequest, type CompletionResponse, type HealthStatus, type ModelInfo, type ProviderConfig } from './base.js';

interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

export class OpenRouterProvider extends BaseProvider {
  private readonly baseUrl = 'https://openrouter.ai/api/v1';

  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || 'https://openrouter.ai/api/v1'
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
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json() as { data: OpenRouterModel[] };

      return data.data.map(m => ({
        id: m.id,
        name: m.name,
        context_window: m.context_length,
        pricing: {
          prompt: parseFloat(m.pricing.prompt) * 1_000_000, // Convert to per 1M tokens
          completion: parseFloat(m.pricing.completion) * 1_000_000
        }
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
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://third-eye-mcp.local',
            'X-Title': 'Third Eye MCP'
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
        throw new Error(`OpenRouter completion failed: ${error}`);
      }

      const data = await response.json();

      return {
        id: data.id,
        model: data.model,
        content: data.choices[0].message.content,
        usage: {
          prompt_tokens: data.usage?.prompt_tokens || 0,
          completion_tokens: data.usage?.completion_tokens || 0,
          total_tokens: data.usage?.total_tokens || 0
        },
        finish_reason: data.choices[0].finish_reason
      };
    } catch (error) {
      throw new Error(`OpenRouter completion error: ${this.normalizeError(error)}`);
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
}
