import { BaseProvider, type ProviderConfig } from './base.js';
import { GroqProvider } from './groq.js';
import { OpenRouterProvider } from './openrouter.js';
import { OllamaProvider } from './ollama.js';
import { LMStudioProvider } from './lmstudio.js';
import { ProviderId, PROVIDERS } from '@third-eye/types/enums';

export type ProviderType = ProviderId;

type ProviderCacheKey = `${ProviderType}:${string}`;

export class ProviderFactory {
  private static providers = new Map<ProviderCacheKey, BaseProvider>();

  static createProvider(type: ProviderType, config: ProviderConfig = {}): BaseProvider {
    const cacheKey: ProviderCacheKey = `${type}:${config.apiKey ?? 'default'}`;

    const cached = this.providers.get(cacheKey);
    if (cached) {
      return cached;
    }

    const provider = this.instantiateProvider(type, config);
    this.providers.set(cacheKey, provider);
    return provider;
  }

  // Alias for backward compatibility
  static create = this.createProvider;

  static clearCache(): void {
    this.providers.clear();
  }

  static getSupportedProviders(): ProviderType[] {
    return [...PROVIDERS];
  }

  static async healthCheckAll(configs: Record<ProviderType, ProviderConfig>): Promise<Record<ProviderType, boolean>> {
    const results: Record<ProviderType, boolean> = {
      groq: false,
      openrouter: false,
      ollama: false,
      lmstudio: false,
    };

    const checks = this.getSupportedProviders().map(async providerId => {
      try {
        const providerConfig = configs[providerId] ?? {};
        const health = await this.createProvider(providerId, providerConfig).health();
        results[providerId] = health.healthy;
      } catch {
        results[providerId] = false;
      }
    });

    await Promise.all(checks);
    return results;
  }

  private static instantiateProvider(type: ProviderType, config: ProviderConfig): BaseProvider {
    switch (type) {
      case 'groq':
        return new GroqProvider(config);
      case 'openrouter':
        return new OpenRouterProvider(config);
      case 'ollama':
        return new OllamaProvider(config);
      case 'lmstudio':
        return new LMStudioProvider(config);
      default:
        throw new Error(`Unsupported provider type: ${type satisfies never}`);
    }
  }
}
