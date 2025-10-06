import type { ProviderClient, ModelInfo, CompletionRequest, CompletionResponse, HealthResponse } from '@third-eye/types';

/**
 * Ollama Provider Client
 *
 * Integrates with local Ollama instance for running local models
 */
export class OllamaProvider implements ProviderClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://127.0.0.1:11434') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      return data.models?.map((model: any) => ({
        name: model.name,
        family: this.extractFamily(model.name),
        capability: {
          ctx: model.details?.parameter_size ? this.estimateContext(model.details.parameter_size) : 8192,
          vision: model.name.includes('vision') || model.name.includes('llava'),
          jsonMode: true, // Most Ollama models support structured output
        },
      })) || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return this.getFallbackModels();
    }
  }

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();

    try {
      // Convert messages to Ollama format
      const systemMessage = req.messages.find(m => m.role === 'system');
      const userMessages = req.messages.filter(m => m.role !== 'system');

      const prompt = userMessages.map(m => m.content).join('\n\n');

      const payload = {
        model: req.model,
        prompt,
        system: systemMessage?.content,
        options: {
          temperature: req.sampling?.temperature ?? 0.7,
          top_p: req.sampling?.top_p ?? 0.9,
          top_k: req.sampling?.top_k ?? 40,
          num_predict: req.maxNewTokens || 4096,
        },
        stream: false,
      };

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Ollama API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      return {
        text: data.response || '',
        tokensIn: data.prompt_eval_count,
        tokensOut: data.eval_count,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.error('Ollama completion failed:', error);
      throw new Error(`Ollama completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async health(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);

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

  private extractFamily(modelName: string): string {
    const name = modelName.toLowerCase();
    if (name.includes('llama')) return 'llama';
    if (name.includes('mistral') || name.includes('mixtral')) return 'mistral';
    if (name.includes('qwen')) return 'qwen';
    if (name.includes('gemma')) return 'gemma';
    if (name.includes('codegemma')) return 'codegemma';
    if (name.includes('codellama')) return 'codellama';
    if (name.includes('llava')) return 'llava';
    if (name.includes('phi')) return 'phi';
    return 'unknown';
  }

  private estimateContext(parameterSize: string): number {
    // Estimate context window based on parameter size
    if (parameterSize.includes('7b') || parameterSize.includes('8b')) return 8192;
    if (parameterSize.includes('13b')) return 16384;
    if (parameterSize.includes('70b')) return 32768;
    return 8192; // Default
  }

  private getFallbackModels(): ModelInfo[] {
    return [
      {
        name: 'llama3.1:8b',
        family: 'llama',
        capability: { ctx: 8192, vision: false, jsonMode: true },
      },
      {
        name: 'mistral:7b',
        family: 'mistral',
        capability: { ctx: 8192, vision: false, jsonMode: true },
      },
      {
        name: 'qwen2:7b',
        family: 'qwen',
        capability: { ctx: 8192, vision: false, jsonMode: true },
      },
    ];
  }
}