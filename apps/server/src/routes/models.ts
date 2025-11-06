import { Hono } from 'hono';
import { getDb } from '@third-eye/db';
import { modelsCache, providerKeys } from '@third-eye/db';
import { ProviderFactory } from '@third-eye/providers';
import { getConfig } from '@third-eye/config';
import { decryptFromStorage } from '@third-eye/core';
import { PROVIDERS, type ProviderId } from '@third-eye/types';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import {
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';

const app = new Hono();

app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

app.get('/:provider', async (c) => {
  const providerId = c.req.param('provider') as ProviderId;

  try {
    const config = getConfig();
    const providerConfig = config.providers[providerId];

    if (!providerConfig) {
      return createErrorResponse(c, {
        title: 'Provider Not Configured',
        status: 400,
        detail: `Provider ${providerId} is not configured`
      });
    }

    const provider = ProviderFactory.create(providerId, providerConfig);
    const models = await provider.listModels();

    const { db } = getDb();
    for (const model of models) {
      await db.insert(modelsCache).values({
        id: nanoid(),
        provider: providerId,
        model: model.id,
        displayName: model.name,
        family: model.family,
        capabilityJson: model.capability,
        lastSeen: new Date(),
      }).onConflictDoUpdate({
        target: [modelsCache.provider, modelsCache.model],
        set: {
          displayName: model.name,
          family: model.family,
          capabilityJson: model.capability,
          lastSeen: new Date(),
        },
      });
    }

    return createSuccessResponse(c, models);
  } catch (error) {
    console.error(`Failed to list models for ${providerId}:`, error);
    if (error instanceof Error && /401/.test(error.message)) {
      return createErrorResponse(c, {
        title: 'Provider Authentication Failed',
        status: 401,
        detail: error.message,
      });
    }
    return createInternalErrorResponse(c, `Failed to list models: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

/**
 * Get list of local providers that don't require API keys
 * SSOT: Providers are infrastructure-level constants, but this helper makes it explicit
 */
function getLocalProviders(): readonly ProviderId[] {
  return ['ollama', 'lmstudio'] as const;
}

const LOCAL_PROVIDERS = getLocalProviders();

app.post('/:provider/refresh', async (c) => {
  const providerId = c.req.param('provider') as ProviderId;
  const isLocalProvider = LOCAL_PROVIDERS.includes(providerId);

  try {
    const { db } = getDb();
    const config = getConfig();

    let providerConfig = config.providers[providerId];

    // Only lookup API key for non-local providers
    if (!isLocalProvider) {
      const keys = await db
        .select()
        .from(providerKeys)
        .where(eq(providerKeys.provider, providerId))
        .limit(1);

      if (keys.length === 0) {
        return createErrorResponse(c, {
          title: 'Provider Key Not Found',
          status: 404,
          detail: `No API key configured for provider ${providerId}`
        });
      }

      const decryptedApiKey = decryptFromStorage(keys[0].encryptedKey);
      providerConfig = {
        ...providerConfig,
        apiKey: decryptedApiKey
      };
    }

    const provider = ProviderFactory.create(providerId, providerConfig);
    const models = await provider.listModels();

    for (const model of models) {
      await db.insert(modelsCache).values({
        provider: providerId,
        model: model.name,
        displayName: model.name,
        family: model.family,
        capabilityJson: model.capability,
        lastSeen: new Date(),
      }).onConflictDoUpdate({
        target: [modelsCache.provider, modelsCache.model],
        set: {
          displayName: model.name,
          family: model.family,
          capabilityJson: model.capability,
          lastSeen: new Date(),
        },
      });
    }

    return createSuccessResponse(c, {
      provider: providerId,
      count: models.length,
      models,
      refreshedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Failed to refresh models for ${providerId}:`, error);
    if (error instanceof Error && /401/.test(error.message)) {
      return createErrorResponse(c, {
        title: 'Provider Authentication Failed',
        status: 401,
        detail: error.message,
      });
    }
    return createInternalErrorResponse(c, `Failed to refresh models: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

app.get('/:provider/cached', async (c) => {
  const providerId = c.req.param('provider') as ProviderId;

  try {
    const { db } = getDb();
    const cachedModels = await db
      .select()
      .from(modelsCache)
      .where(eq(modelsCache.provider, providerId))
      .orderBy(desc(modelsCache.lastSeen))
      .all();

    const models = cachedModels.map(m => ({
      name: m.model,
      displayName: m.displayName,
      family: m.family,
      capability: m.capabilityJson,
      lastSeen: m.lastSeen,
    }));

    return createSuccessResponse(c, models);
  } catch (error) {
    console.error(`Failed to get cached models for ${providerId}:`, error);
    return createInternalErrorResponse(c, `Failed to get cached models`);
  }
});

app.get('/', async (c) => {
  try {
    const { db } = getDb();
    const allCachedModels = await db
      .select()
      .from(modelsCache)
      .orderBy(desc(modelsCache.lastSeen))
      .all();

    const modelsByProvider: Record<string, any[]> = {};

    for (const m of allCachedModels) {
      if (!modelsByProvider[m.provider]) {
        modelsByProvider[m.provider] = [];
      }
      modelsByProvider[m.provider].push({
        name: m.model,
        displayName: m.displayName,
        family: m.family,
        capability: m.capabilityJson,
        lastSeen: m.lastSeen,
      });
    }

    return createSuccessResponse(c, {
      providers: Object.keys(modelsByProvider),
      totalModels: allCachedModels.length,
      modelsByProvider,
    });
  } catch (error) {
    console.error('Failed to get all cached models:', error);
    return createInternalErrorResponse(c, 'Failed to get cached models');
  }
});

export default app;
