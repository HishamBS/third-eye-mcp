import type { ProviderClient, ModelInfo, CompletionRequest, CompletionResponse, HealthResponse } from '@third-eye/types';

/**
 * Groq Provider Client
 *
 * Integrates with Groq's OpenAI-compatible API
 */
export class GroqProvider implements ProviderClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl = 'https://api.groq.com/openai/v1', apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    if (!apiKey) {
      throw new Error('Groq API key is required');
    }
    this.apiKey = apiKey;
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return data.data?.map((model: any) => ({
        name: model.id,
        family: this.extractFamily(model.id),
        capability: {
          ctx: model.context_window || 32768,
          vision: model.id.includes('vision') || model.id.includes('vision'),
          jsonMode: true, // Most Groq models support JSON mode
        },
      })) || [];
    } catch (error) {
      console.error('Failed to list Groq models:', error);
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
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
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
      console.error('Groq completion failed:', error);
      throw new Error(`Groq completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async health(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
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
    if (modelId.includes('llama')) return 'llama';
    if (modelId.includes('mixtral')) return 'mixtral';
    if (modelId.includes('gemma')) return 'gemma';
    return 'unknown';
  }

  private getFallbackModels(): ModelInfo[] {
    return [
      {
        name: 'llama-3.1-70b-versatile',
        family: 'llama',
        capability: { ctx: 32768, vision: false, jsonMode: true },
      },
      {
        name: 'llama-3.1-8b-instant',
        family: 'llama',
        capability: { ctx: 32768, vision: false, jsonMode: true },
      },
      {
        name: 'mixtral-8x7b-32768',
        family: 'mixtral',
        capability: { ctx: 32768, vision: false, jsonMode: true },
      },
    ];
  }
}