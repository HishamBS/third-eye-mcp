/**
 * Model Discovery and Caching System
 *
 * Discovers available models from all providers and caches them in the database
 */
import type { ProviderId } from '@third-eye/types';
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
export declare class ModelDiscoveryService {
    private static instance;
    private discoveryInProgress;
    static getInstance(): ModelDiscoveryService;
    /**
     * Discover and cache models from all available providers
     */
    discoverAllModels(): Promise<void>;
    /**
     * Discover models from a specific provider
     */
    discoverProviderModels(providerId: ProviderId): Promise<number>;
    /**
     * Cache discovered models in the database
     */
    private cacheModels;
    /**
     * Get cached models for a specific provider
     */
    getCachedModels(providerId: ProviderId): Promise<ModelCacheEntry[]>;
    /**
     * Get all cached models across providers
     */
    getAllCachedModels(): Promise<ModelCacheEntry[]>;
    /**
     * Check if a specific model exists in cache
     */
    hasModel(providerId: ProviderId, modelName: string): Promise<boolean>;
    /**
     * Get model capabilities
     */
    getModelCapabilities(providerId: ProviderId, modelName: string): Promise<ModelCacheEntry['capability'] | null>;
    /**
     * Find best model for specific capabilities
     */
    findBestModel(requirements: {
        provider?: ProviderId;
        minContext?: number;
        requiresVision?: boolean;
        requiresJsonMode?: boolean;
        family?: string;
    }): Promise<ModelCacheEntry | null>;
    /**
     * Refresh cache for a specific provider
     */
    refreshProvider(providerId: ProviderId): Promise<void>;
    /**
     * Get cache statistics
     */
    getCacheStats(): Promise<{
        totalModels: number;
        providerCounts: Record<ProviderId, number>;
        lastRefresh: Date | null;
    }>;
}
export declare const modelDiscovery: ModelDiscoveryService;
//# sourceMappingURL=model-discovery.d.ts.map