import { BaseProvider, type ProviderConfig } from './base.js';
import { GroqProvider } from './groq.js';
import { OpenRouterProvider } from './openrouter.js';
import { OllamaProvider } from './ollama.js';
import { LMStudioProvider } from './lmstudio.js';

export type ProviderType = 'groq' | 'openrouter' | 'ollama' | 'lmstudio';

export class ProviderFactory {
  private static providers = new Map<string, BaseProvider>();

  static createProvider(type: ProviderType, config: ProviderConfig = {}): BaseProvider {
    const key = `${type}:${config.apiKey || 'default'}`;

    // Reuse existing provider instance if config matches
    if (this.providers.has(key)) {
      return this.providers.get(key)!;
    }

    let provider: BaseProvider;

    switch (type) {
      case 'groq':
        provider = new GroqProvider(config);
        break;
      case 'openrouter':
        provider = new OpenRouterProvider(config);
        break;
      case 'ollama':
        provider = new OllamaProvider(config);
        break;
      case 'lmstudio':
        provider = new LMStudioProvider(config);
        break;
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }

    this.providers.set(key, provider);
    return provider;
  }

  static clearCache(): void {
    this.providers.clear();
  }

  static getSupportedProviders(): ProviderType[] {
    return ['groq', 'openrouter', 'ollama', 'lmstudio'];
  }

  static async healthCheckAll(configs: Record<ProviderType, ProviderConfig>): Promise<Record<ProviderType, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [type, config] of Object.entries(configs) as [ProviderType, ProviderConfig][]) {
      try {
        const provider = this.createProvider(type, config);
        const health = await provider.health();
        results[type] = health.healthy;
      } catch {
        results[type] = false;
      }
    }

    return results as Record<ProviderType, boolean>;
  }
}
