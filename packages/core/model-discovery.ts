/**
 * Model Discovery and Caching System
 *
 * Discovers available models from all providers and caches them in the database
 */

import { Buffer } from 'node:buffer';
import { getDb } from '@third-eye/db';
import { modelsCache, providerKeys } from '@third-eye/db/schema';
import { ProviderFactory, BaseProvider } from '@third-eye/providers';
import type { ProviderConfig } from '@third-eye/providers';
import { PROVIDERS, type ProviderId } from '@third-eye/types';
import { eq, and, desc } from 'drizzle-orm';
import { decryptFromStorage } from './encryption';
import { z } from 'zod';

const CapabilitySchema = z
  .object({
    ctx: z.number().optional(),
    vision: z.boolean().optional(),
    jsonMode: z.boolean().optional(),
  })
  .optional();

type ProviderModel = Awaited<ReturnType<BaseProvider['listModels']>> extends Array<infer Item>
  ? Item
  : never;

type ModelCapability = {
  ctx?: number;
  vision?: boolean;
  jsonMode?: boolean;
};

interface NormalizedModel {
  id: string;
  displayName: string | null;
  family: string | null;
  capability: ModelCapability;
}

function isProviderId(value: unknown): value is ProviderId {
  if (typeof value !== 'string') {
    return false;
  }
  return PROVIDERS.some(provider => provider === value);
}

export interface ModelCacheEntry {
  provider: ProviderId;
  model: string;
  displayName: string | null;
  family: string | null;
  capability: {
    ctx?: number;
    vision?: boolean;
    jsonMode?: boolean;
  };
  lastSeen: Date;
}

export class ModelDiscoveryService {
  private static instance: ModelDiscoveryService | null = null;
  private discoveryInProgress = new Set<ProviderId>();
  private static readonly providersRequiringApiKey = new Set<ProviderId>(['groq', 'openrouter']);

  static getInstance(): ModelDiscoveryService {
    if (!ModelDiscoveryService.instance) {
      ModelDiscoveryService.instance = new ModelDiscoveryService();
    }
    return ModelDiscoveryService.instance;
  }

  /**
   * Discover and cache models from all available providers
   */
  async discoverAllModels(): Promise<void> {
    const providers = ProviderFactory.getSupportedProviders();

    console.log('🔍 Starting model discovery for all providers...');

    const results = await Promise.allSettled(
      providers.map(providerId => this.discoverProviderModels(providerId))
    );

    let successful = 0;
    let failed = 0;

    results.forEach((result, index) => {
      const providerId = providers[index];
      if (result.status === 'fulfilled') {
        successful++;
        console.log(`✅ ${providerId}: ${result.value} models discovered`);
      } else {
        failed++;
        console.warn(`⚠️  ${providerId}: ${result.reason}`);
      }
    });

    console.log(`🧿 Model discovery complete: ${successful} providers successful, ${failed} failed`);
  }

  /**
   * Discover models from a specific provider
   */
  async discoverProviderModels(providerId: ProviderId): Promise<number> {
    if (this.discoveryInProgress.has(providerId)) {
      throw new Error(`Discovery already in progress for ${providerId}`);
    }

    this.discoveryInProgress.add(providerId);

    try {
      console.log(`🔍 Discovering models for ${providerId}...`);

      const provider = await this.createProviderInstance(providerId);
      if (!provider) {
        console.warn(`No credentials configured for ${providerId}, skipping`);
        return 0;
      }

      // Check provider health first
      const health = await provider.health();
      if (!health.healthy) {
        throw new Error(`Provider ${providerId} is not healthy`);
      }

      // Discover models
      const models = await provider.listModels();

      if (models.length === 0) {
        console.warn(`⚠️  No models found for ${providerId}`);
        return 0;
      }

      // Cache models in database
      await this.cacheModels(providerId, models);

      return models.length;
    } finally {
      this.discoveryInProgress.delete(providerId);
    }
  }

  /**
   * Cache discovered models in the database
   */
  private normalizeModel(model: ProviderModel): NormalizedModel {
    const capability: ModelCapability = {};

    if (typeof model.context_window === 'number') {
      capability.ctx = model.context_window;
    }

    const displayName = typeof model.name === 'string' ? model.name : model.id;

    return {
      id: model.id,
      displayName,
      family: null,
      capability,
    };
  }

  private async cacheModels(providerId: ProviderId, models: ProviderModel[]): Promise<void> {
    const { db } = getDb();
    const now = new Date();

    // Prepare data for batch insert
    const cacheEntries = models.map(model => {
      const normalized = this.normalizeModel(model);
      return {
        provider: providerId,
        model: normalized.id,
        displayName: normalized.displayName,
        family: normalized.family,
        capabilityJson: normalized.capability,
        lastSeen: now,
      };
    });

    try {
      // Use transaction for atomic updates
      await db.transaction(async (tx) => {
        // Delete existing entries for this provider
        await tx.delete(modelsCache).where(eq(modelsCache.provider, providerId));

        // Insert new entries
        if (cacheEntries.length > 0) {
          await tx.insert(modelsCache).values(cacheEntries);
        }
      });

      console.log(`💾 Cached ${models.length} models for ${providerId}`);
    } catch (error) {
      console.error(`Failed to cache models for ${providerId}:`, error);
      throw error;
    }
  }

  /**
   * Get cached models for a specific provider
   */
  async getCachedModels(providerId: ProviderId): Promise<ModelCacheEntry[]> {
    const { db } = getDb();

    try {
      const results = await db
        .select()
        .from(modelsCache)
        .where(eq(modelsCache.provider, providerId));

      return results.map(row => ModelDiscoveryService.toCacheEntry(row));
    } catch (error) {
      console.error(`Failed to get cached models for ${providerId}:`, error);
      return [];
    }
  }

  /**
   * Get all cached models across providers
   */
  async getAllCachedModels(): Promise<ModelCacheEntry[]> {
    const { db } = getDb();

    try {
      const results = await db.select().from(modelsCache);

      return results.map(row => ModelDiscoveryService.toCacheEntry(row));
    } catch (error) {
      console.error('Failed to get all cached models:', error);
      return [];
    }
  }

  private async createProviderInstance(providerId: ProviderId): Promise<BaseProvider | null> {
    const requiresApiKey = ModelDiscoveryService.providersRequiringApiKey.has(providerId);
    const config = await this.resolveProviderConfig(providerId, requiresApiKey);

    if (requiresApiKey && !config.apiKey) {
      return null;
    }

    return ProviderFactory.createProvider(providerId, config);
  }

  private async resolveProviderConfig(providerId: ProviderId, requiresApiKey: boolean): Promise<ProviderConfig> {
    if (!requiresApiKey) {
      return this.defaultConfig(providerId);
    }

    const configFromDb = await this.loadConfigFromDatabase(providerId);
    if (configFromDb) {
      return configFromDb;
    }

    const configFromEnv = this.loadConfigFromEnvironment(providerId);
    if (configFromEnv) {
      return configFromEnv;
    }

    return {};
  }

  private async loadConfigFromDatabase(providerId: ProviderId): Promise<ProviderConfig | null> {
    const { db } = getDb();

    const row = await db
      .select()
      .from(providerKeys)
      .where(eq(providerKeys.provider, providerId))
      .orderBy(desc(providerKeys.createdAt))
      .limit(1)
      .then(result => result.at(0) ?? null);

    if (!row) {
      return null;
    }

    const encryptedKey = row.encryptedKey;
    if (!(encryptedKey instanceof Uint8Array)) {
      return null;
    }

    const apiKey = decryptFromStorage(Buffer.from(encryptedKey));
    const baseConfig = this.defaultConfig(providerId);
    return { ...baseConfig, apiKey };
  }

  private loadConfigFromEnvironment(providerId: ProviderId): ProviderConfig | null {
    if (providerId === 'groq') {
      const apiKey = process.env.GROQ_API_KEY;
      return apiKey ? { baseUrl: 'https://api.groq.com/openai/v1', apiKey } : null;
    }
    if (providerId === 'openrouter') {
      const apiKey = process.env.OPENROUTER_API_KEY;
      return apiKey ? { baseUrl: 'https://openrouter.ai/api/v1', apiKey } : null;
    }
    return null;
  }

  private defaultConfig(providerId: ProviderId): ProviderConfig {
    switch (providerId) {
      case 'groq':
        return { baseUrl: 'https://api.groq.com/openai/v1' };
      case 'openrouter':
        return { baseUrl: 'https://openrouter.ai/api/v1' };
      case 'ollama':
        return { baseUrl: 'http://127.0.0.1:11434' };
      case 'lmstudio':
        return { baseUrl: 'http://127.0.0.1:1234/v1' };
      default:
        return {};
    }
  }

  private static toCacheEntry(row: typeof modelsCache.$inferSelect): ModelCacheEntry {
    const capabilityResult = CapabilitySchema.safeParse(row.capabilityJson);
    const capability = capabilityResult.success && capabilityResult.data ? capabilityResult.data : {};

    if (!isProviderId(row.provider)) {
      throw new Error(`Unknown provider stored in models cache: ${row.provider}`);
    }

    return {
      provider: row.provider,
      model: row.model,
      displayName: row.displayName,
      family: row.family,
      capability,
      lastSeen: row.lastSeen,
    };
  }

  /**
   * Check if a specific model exists in cache
   */
  async hasModel(providerId: ProviderId, modelName: string): Promise<boolean> {
    const { db } = getDb();

    try {
      const result = await db
        .select({ model: modelsCache.model })
        .from(modelsCache)
        .where(and(
          eq(modelsCache.provider, providerId),
          eq(modelsCache.model, modelName)
        ))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error(`Failed to check if model exists: ${providerId}/${modelName}`, error);
      return false;
    }
  }

  /**
   * Get model capabilities
   */
  async getModelCapabilities(providerId: ProviderId, modelName: string): Promise<ModelCacheEntry['capability'] | null> {
    const { db } = getDb();

    try {
      const result = await db
        .select({ capabilityJson: modelsCache.capabilityJson })
        .from(modelsCache)
        .where(and(
          eq(modelsCache.provider, providerId),
          eq(modelsCache.model, modelName)
        ))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const parseResult = CapabilitySchema.safeParse(result[0].capabilityJson);
      return parseResult.success ? parseResult.data ?? null : null;
    } catch (error) {
      console.error(`Failed to get model capabilities: ${providerId}/${modelName}`, error);
      return null;
    }
  }

  /**
   * Find best model for specific capabilities
   */
  async findBestModel(requirements: {
    provider?: ProviderId;
    minContext?: number;
    requiresVision?: boolean;
    requiresJsonMode?: boolean;
    family?: string;
  }): Promise<ModelCacheEntry | null> {
    const allModels = await this.getAllCachedModels();

    let candidates = allModels;

    // Filter by provider if specified
    if (requirements.provider) {
      candidates = candidates.filter(m => m.provider === requirements.provider);
    }

    // Filter by minimum context
    if (typeof requirements.minContext === 'number') {
      const minimumContext = requirements.minContext;
      candidates = candidates.filter(model => {
        const context = model.capability.ctx;
        return typeof context === 'number' && context >= minimumContext;
      });
    }

    // Filter by vision requirement
    if (requirements.requiresVision) {
      candidates = candidates.filter(m => m.capability.vision === true);
    }

    // Filter by JSON mode requirement
    if (requirements.requiresJsonMode) {
      candidates = candidates.filter(m => m.capability.jsonMode === true);
    }

    // Filter by family if specified
    if (requirements.family) {
      candidates = candidates.filter(m => m.family === requirements.family);
    }

    if (candidates.length === 0) {
      return null;
    }

    // Sort by context size (descending) and return the best match
    candidates.sort((a, b) => (b.capability.ctx || 0) - (a.capability.ctx || 0));

    return candidates[0];
  }

  /**
   * Refresh cache for a specific provider
   */
  async refreshProvider(providerId: ProviderId): Promise<void> {
    console.log(`🔄 Refreshing model cache for ${providerId}...`);
    await this.discoverProviderModels(providerId);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalModels: number;
    providerCounts: Record<ProviderId, number>;
    lastRefresh: Date | null;
  }> {
    const allModels = await this.getAllCachedModels();

    const providerCounts: Record<ProviderId, number> = {
      groq: 0,
      openrouter: 0,
      ollama: 0,
      lmstudio: 0,
    };
    let lastRefresh: Date | null = null;

    allModels.forEach(model => {
      providerCounts[model.provider] = (providerCounts[model.provider] || 0) + 1;

      if (!lastRefresh || model.lastSeen > lastRefresh) {
        lastRefresh = model.lastSeen;
      }
    });

    return {
      totalModels: allModels.length,
      providerCounts,
      lastRefresh,
    };
  }
}

// Export singleton instance
export const modelDiscovery = ModelDiscoveryService.getInstance();
