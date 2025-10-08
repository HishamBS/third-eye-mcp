/**
 * Model Discovery and Caching System
 *
 * Discovers available models from all providers and caches them in the database
 */
import { getDb } from '@third-eye/db';
import { modelsCache } from '@third-eye/db/schema';
import { ProviderFactory } from '@third-eye/providers';
import { eq, and } from 'drizzle-orm';
export class ModelDiscoveryService {
    static instance = null;
    discoveryInProgress = new Set();
    static getInstance() {
        if (!ModelDiscoveryService.instance) {
            ModelDiscoveryService.instance = new ModelDiscoveryService();
        }
        return ModelDiscoveryService.instance;
    }
    /**
     * Discover and cache models from all available providers
     */
    async discoverAllModels() {
        const providers = ProviderFactory.getAvailableProviders();
        console.log('🔍 Starting model discovery for all providers...');
        const results = await Promise.allSettled(providers.map(providerId => this.discoverProviderModels(providerId)));
        let successful = 0;
        let failed = 0;
        results.forEach((result, index) => {
            const providerId = providers[index];
            if (result.status === 'fulfilled') {
                successful++;
                console.log(`✅ ${providerId}: ${result.value} models discovered`);
            }
            else {
                failed++;
                console.warn(`⚠️  ${providerId}: ${result.reason}`);
            }
        });
        console.log(`🧿 Model discovery complete: ${successful} providers successful, ${failed} failed`);
    }
    /**
     * Discover models from a specific provider
     */
    async discoverProviderModels(providerId) {
        if (this.discoveryInProgress.has(providerId)) {
            throw new Error(`Discovery already in progress for ${providerId}`);
        }
        this.discoveryInProgress.add(providerId);
        try {
            console.log(`🔍 Discovering models for ${providerId}...`);
            // Create provider instance - allow Ollama/LM Studio without API keys
            let provider;
            // For cloud providers, require API key from database
            if (ProviderFactory.requiresApiKey(providerId)) {
                try {
                    provider = await ProviderFactory.createFromDatabase(providerId);
                }
                catch (error) {
                    console.warn(`No API key found for ${providerId}, skipping...`);
                    return 0;
                }
            }
            else {
                // For local providers (Ollama, LM Studio), use default config (no API key needed)
                const config = ProviderFactory.getDefaultConfig(providerId);
                provider = ProviderFactory.create(providerId, config);
            }
            // Check provider health first
            const health = await provider.health();
            if (!health.ok) {
                throw new Error(`Provider ${providerId} is not healthy: ${JSON.stringify(health.details)}`);
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
        }
        finally {
            this.discoveryInProgress.delete(providerId);
        }
    }
    /**
     * Cache discovered models in the database
     */
    async cacheModels(providerId, models) {
        const { db } = getDb();
        const now = new Date();
        // Prepare data for batch insert
        const cacheEntries = models.map(model => ({
            provider: providerId,
            model: model.name,
            displayName: model.name, // Could be enhanced with better display names
            family: model.family || 'unknown',
            capabilityJson: model.capability || {},
            lastSeen: now,
        }));
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
        }
        catch (error) {
            console.error(`Failed to cache models for ${providerId}:`, error);
            throw error;
        }
    }
    /**
     * Get cached models for a specific provider
     */
    async getCachedModels(providerId) {
        const { db } = getDb();
        try {
            const results = await db
                .select()
                .from(modelsCache)
                .where(eq(modelsCache.provider, providerId));
            return results.map(row => ({
                provider: row.provider,
                model: row.model,
                displayName: row.displayName,
                family: row.family,
                capability: row.capabilityJson || {},
                lastSeen: row.lastSeen,
            }));
        }
        catch (error) {
            console.error(`Failed to get cached models for ${providerId}:`, error);
            return [];
        }
    }
    /**
     * Get all cached models across providers
     */
    async getAllCachedModels() {
        const { db } = getDb();
        try {
            const results = await db.select().from(modelsCache);
            return results.map(row => ({
                provider: row.provider,
                model: row.model,
                displayName: row.displayName,
                family: row.family,
                capability: row.capabilityJson || {},
                lastSeen: row.lastSeen,
            }));
        }
        catch (error) {
            console.error('Failed to get all cached models:', error);
            return [];
        }
    }
    /**
     * Check if a specific model exists in cache
     */
    async hasModel(providerId, modelName) {
        const { db } = getDb();
        try {
            const result = await db
                .select({ count: 1 })
                .from(modelsCache)
                .where(and(eq(modelsCache.provider, providerId), eq(modelsCache.model, modelName)))
                .limit(1);
            return result.length > 0;
        }
        catch (error) {
            console.error(`Failed to check if model exists: ${providerId}/${modelName}`, error);
            return false;
        }
    }
    /**
     * Get model capabilities
     */
    async getModelCapabilities(providerId, modelName) {
        const { db } = getDb();
        try {
            const result = await db
                .select({ capabilityJson: modelsCache.capabilityJson })
                .from(modelsCache)
                .where(and(eq(modelsCache.provider, providerId), eq(modelsCache.model, modelName)))
                .limit(1);
            return result.length > 0 ? result[0].capabilityJson : null;
        }
        catch (error) {
            console.error(`Failed to get model capabilities: ${providerId}/${modelName}`, error);
            return null;
        }
    }
    /**
     * Find best model for specific capabilities
     */
    async findBestModel(requirements) {
        const allModels = await this.getAllCachedModels();
        let candidates = allModels;
        // Filter by provider if specified
        if (requirements.provider) {
            candidates = candidates.filter(m => m.provider === requirements.provider);
        }
        // Filter by minimum context
        if (requirements.minContext) {
            candidates = candidates.filter(m => m.capability.ctx && m.capability.ctx >= requirements.minContext);
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
    async refreshProvider(providerId) {
        console.log(`🔄 Refreshing model cache for ${providerId}...`);
        await this.discoverProviderModels(providerId);
    }
    /**
     * Get cache statistics
     */
    async getCacheStats() {
        const allModels = await this.getAllCachedModels();
        const providerCounts = {};
        let lastRefresh = null;
        allModels.forEach(model => {
            providerCounts[model.provider] = (providerCounts[model.provider] || 0) + 1;
            if (!lastRefresh || model.lastSeen > lastRefresh) {
                lastRefresh = model.lastSeen;
            }
        });
        return {
            totalModels: allModels.length,
            providerCounts: providerCounts,
            lastRefresh,
        };
    }
}
// Export singleton instance
export const modelDiscovery = ModelDiscoveryService.getInstance();
//# sourceMappingURL=model-discovery.js.map