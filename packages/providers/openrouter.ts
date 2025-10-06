import type { ProviderClient, ModelInfo, CompletionRequest, CompletionResponse, HealthResponse } from '@third-eye/types';

/**
 * OpenRouter Provider Client
 *
 * Integrates with OpenRouter's unified API for multiple model providers
 */
export class OpenRouterProvider implements ProviderClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl = 'https://openrouter.ai/api/v1', apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }
    this.apiKey = apiKey;
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'Third Eye MCP',
        },
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return data.data?.map((model: any) => ({
        name: model.id,
        family: this.extractFamily(model.id),
        capability: {
          ctx: model.context_length || 8192,
          vision: model.architecture?.modality?.includes('vision') || false,
          jsonMode: model.supports_functions || false,
        },
      })) || [];
    } catch (error) {
      console.error('Failed to list OpenRouter models:', error);
      return this.getFallbackModels();
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();

    try {
      const payload = {
        model: req.model,
        messages: req.messages,
        max_tokens: req.maxNewTokens || 4096,
        temperature: req.sampling?.temperature ?? 0.7,
        top_p: req.sampling?.top_p ?? 0.9,
        stream: false,
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Title': 'Third Eye MCP',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      return {
        text: data.choices?.[0]?.message?.content || '',
        tokensIn: data.usage?.prompt_tokens,
        tokensOut: data.usage?.completion_tokens,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.error('OpenRouter completion failed:', error);
      throw new Error(`OpenRouter completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async health(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Title': 'Third Eye MCP',
        },
      });

      return {
        ok: response.ok,
        details: {
          status: response.status,
          statusText: response.statusText,
        },
      };
    } catch (error) {
      return {
        ok: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  private extractFamily(modelId: string): string {
    if (modelId.includes('gpt')) return 'gpt';
    if (modelId.includes('claude')) return 'claude';
    if (modelId.includes('llama')) return 'llama';
    if (modelId.includes('mixtral')) return 'mixtral';
    if (modelId.includes('gemini')) return 'gemini';
    if (modelId.includes('qwen')) return 'qwen';
    return 'unknown';
  }

  private getFallbackModels(): ModelInfo[] {
    return [
      {
        name: 'openai/gpt-4o-mini',
        family: 'gpt',
        capability: { ctx: 128000, vision: true, jsonMode: true },
      },
      {
        name: 'anthropic/claude-3.5-sonnet',
        family: 'claude',
        capability: { ctx: 200000, vision: true, jsonMode: false },
      },
      {
        name: 'meta-llama/llama-3.1-8b-instruct',
        family: 'llama',
        capability: { ctx: 128000, vision: false, jsonMode: true },
      },
    ];
  }
}