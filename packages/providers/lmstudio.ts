import type { ProviderClient, ModelInfo, CompletionRequest, CompletionResponse, HealthResponse } from '@third-eye/types';

/**
 * LM Studio Provider Client
 *
 * Integrates with local LM Studio server for running local models
 */
export class LMStudioProvider implements ProviderClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://127.0.0.1:1234') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`);

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return data.data?.map((model: any) => ({
        name: model.id,
        family: this.extractFamily(model.id),
        capability: {
          ctx: model.context_length || 8192,
          vision: model.id.includes('vision') || model.id.includes('llava'),
          jsonMode: true, // LM Studio supports structured output
        },
      })) || [];
    } catch (error) {
      console.error('Failed to list LM Studio models:', error);
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

      const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`LM Studio API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
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
      console.error('LM Studio completion failed:', error);
      throw new Error(`LM Studio completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async health(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/models`);

      return {
        ok: response.ok,
        details: {
          status: response.status,
          statusText: response.statusText,
          endpoint: this.baseUrl,
        },
      };
    } catch (error) {
      return {
        ok: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          endpoint: this.baseUrl,
        },
      };
    }
  }

  private extractFamily(modelId: string): string {
    const name = modelId.toLowerCase();
    if (name.includes('llama')) return 'llama';
    if (name.includes('mistral') || name.includes('mixtral')) return 'mistral';
    if (name.includes('qwen')) return 'qwen';
    if (name.includes('gemma')) return 'gemma';
    if (name.includes('phi')) return 'phi';
    if (name.includes('deepseek')) return 'deepseek';
    if (name.includes('codegemma')) return 'codegemma';
    if (name.includes('codellama')) return 'codellama';
    return 'unknown';
  }

  private getFallbackModels(): ModelInfo[] {
    return [
      {
        name: 'llama-3.1-8b-instruct',
        family: 'llama',
        capability: { ctx: 8192, vision: false, jsonMode: true },
      },
      {
        name: 'mistral-7b-instruct',
        family: 'mistral',
        capability: { ctx: 8192, vision: false, jsonMode: true },
      },
      {
        name: 'qwen2-7b-instruct',
        family: 'qwen',
        capability: { ctx: 8192, vision: false, jsonMode: true },
      },
    ];
  }
}