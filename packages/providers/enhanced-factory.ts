import type {
  ProviderClient,
  ModelInfo,
  CompletionRequest,
  CompletionResponse,
  HealthResponse,
} from '@third-eye/types';
import { ProviderFactory, type ProviderType } from './src/factory.js';
import type { ProviderConfig } from './src/base.js';

interface ProviderInstance {
  client: ProviderClient;
  lastRequestAt: number;
  requestCount: number;
  healthy: boolean;
  lastHealthCheckAt: number;
}

interface ProviderStats {
  instances: number;
  totalRequests: number;
  healthyInstances: number;
  lastHealthCheckAt: number;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 100;
const HEALTH_CHECK_INTERVAL_MS = 300_000;

export class EnhancedProviderFactory {
  private static readonly instances = new Map<string, ProviderInstance>();

  static async getProvider(providerId: ProviderType, config: ProviderConfig = {}): Promise<ProviderClient> {
    const cacheKey = EnhancedProviderFactory.buildCacheKey(providerId, config);
    const now = Date.now();

    let instance = EnhancedProviderFactory.instances.get(cacheKey);

    if (!instance) {
      const client = await EnhancedProviderFactory.createClient(providerId, config);
      instance = {
        client,
        lastRequestAt: 0,
        requestCount: 0,
        healthy: true,
        lastHealthCheckAt: 0,
      };
      EnhancedProviderFactory.instances.set(cacheKey, instance);
    }

    await EnhancedProviderFactory.refreshHealthIfStale(instance, providerId, config, now);
    EnhancedProviderFactory.guardRateLimit(instance, now);

    instance.lastRequestAt = now;
    instance.requestCount += 1;

    return EnhancedProviderFactory.wrapClient(instance.client);
  }

  static clearCache(): void {
    EnhancedProviderFactory.instances.clear();
  }

  static async getProviderStats(): Promise<Record<ProviderType, ProviderStats>> {
    const stats: Record<ProviderType, ProviderStats> = {
      groq: EnhancedProviderFactory.emptyStats(),
      openrouter: EnhancedProviderFactory.emptyStats(),
      ollama: EnhancedProviderFactory.emptyStats(),
      lmstudio: EnhancedProviderFactory.emptyStats(),
    };

    for (const [cacheKey, instance] of EnhancedProviderFactory.instances.entries()) {
      const providerId = EnhancedProviderFactory.parseCacheKey(cacheKey);
      const providerStats = stats[providerId];

      providerStats.instances += 1;
      providerStats.totalRequests += instance.requestCount;
      if (instance.healthy) {
        providerStats.healthyInstances += 1;
      }
      providerStats.lastHealthCheckAt = Math.max(providerStats.lastHealthCheckAt, instance.lastHealthCheckAt);
    }

    return stats;
  }

  private static createClient(providerId: ProviderType, config: ProviderConfig): ProviderClient {
    return ProviderFactory.createProvider(providerId, config);
  }

  private static buildCacheKey(providerId: ProviderType, config: ProviderConfig): string {
    const keyParts = [providerId];
    if (config.apiKey) {
      keyParts.push(config.apiKey);
    }
    if (config.baseUrl) {
      keyParts.push(config.baseUrl);
    }
    return keyParts.join(':');
  }

  private static parseCacheKey(cacheKey: string): ProviderType {
    const providerId = cacheKey.split(':')[0];
    if (providerId === 'groq' || providerId === 'openrouter' || providerId === 'ollama' || providerId === 'lmstudio') {
      return providerId;
    }
    throw new Error(`Unknown provider cache key: ${cacheKey}`);
  }

  private static guardRateLimit(instance: ProviderInstance, now: number): void {
    if (now - instance.lastRequestAt > RATE_LIMIT_WINDOW_MS) {
      instance.requestCount = 0;
      return;
    }

    if (instance.requestCount >= MAX_REQUESTS_PER_WINDOW) {
      const secondsRemaining = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - instance.lastRequestAt)) / 1000);
      throw new Error(`Rate limit exceeded. Try again in ${secondsRemaining}s`);
    }
  }

  private static async refreshHealthIfStale(
    instance: ProviderInstance,
    providerId: ProviderType,
    config: ProviderConfig,
    now: number,
  ): Promise<void> {
    if (now - instance.lastHealthCheckAt < HEALTH_CHECK_INTERVAL_MS) {
      return;
    }

    const client = EnhancedProviderFactory.createClient(providerId, config);
    const health = await client.health();
    instance.healthy = health.healthy;
    instance.lastHealthCheckAt = now;
  }

  private static wrapClient(client: ProviderClient): ProviderClient {
    const wrapListModels = async (): Promise<ModelInfo[]> => client.listModels();

    const wrapComplete = async (request: CompletionRequest): Promise<CompletionResponse> => client.complete(request);

    const wrapHealth = async (): Promise<HealthResponse> => client.health();

    return {
      listModels: wrapListModels,
      complete: wrapComplete,
      health: wrapHealth,
    };
  }

  private static emptyStats(): ProviderStats {
    return {
      instances: 0,
      totalRequests: 0,
      healthyInstances: 0,
      lastHealthCheckAt: 0,
    };
  }
}
