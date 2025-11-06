import { Hono } from 'hono';
import { ModelDiscoveryService } from '@third-eye/core/model-discovery';
import { type ProviderId } from '@third-eye/types';
import { logger } from '@third-eye/core';
import {
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';

// Type for cached model response
interface CachedModelResponse {
  name: string;
  displayName: string | null;
  family: string | null;
  capability: unknown;
  lastSeen: Date | null;
}

const app = new Hono();

app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

app.get('/:provider', async (c) => {
  const providerId = c.req.param('provider') as ProviderId;
  const modelDiscovery = ModelDiscoveryService.getInstance();

  try {
    // Discover and cache models for this provider
    const count = await modelDiscovery.discoverProviderModels(providerId);

    // Get the cached models
    const cachedModels = await modelDiscovery.getCachedModels(providerId);

    // Transform to API response format
    const models = cachedModels.map(m => ({
      id: m.model,
      name: m.displayName || m.model,
      family: m.family,
      capability: m.capability,
    }));

    return createSuccessResponse(c, models);
  } catch (error) {
    logger.error(`Failed to list models for ${providerId}`, { error, providerId });
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

app.post('/:provider/refresh', async (c) => {
  const providerId = c.req.param('provider') as ProviderId;
  const modelDiscovery = ModelDiscoveryService.getInstance();

  try {
    // Use service layer to refresh provider models
    await modelDiscovery.refreshProvider(providerId);

    // Get the refreshed cached models
    const cachedModels = await modelDiscovery.getCachedModels(providerId);

    // Transform to API response format
    const models = cachedModels.map(m => ({
      id: m.model,
      name: m.displayName || m.model,
      family: m.family,
      capability: m.capability,
    }));

    return createSuccessResponse(c, {
      provider: providerId,
      count: models.length,
      models,
      refreshedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to refresh models for ${providerId}`, { error, providerId });
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
  const modelDiscovery = ModelDiscoveryService.getInstance();

  try {
    const cachedModels = await modelDiscovery.getCachedModels(providerId);

    const models = cachedModels.map(m => ({
      name: m.model,
      displayName: m.displayName,
      family: m.family,
      capability: m.capability,
      lastSeen: m.lastSeen,
    }));

    return createSuccessResponse(c, models);
  } catch (error) {
    logger.error(`Failed to get cached models for ${providerId}`, { error, providerId });
    return createInternalErrorResponse(c, `Failed to get cached models`);
  }
});

app.get('/', async (c) => {
  const modelDiscovery = ModelDiscoveryService.getInstance();

  try {
    const allCachedModels = await modelDiscovery.getAllCachedModels();

    const modelsByProvider: Record<string, CachedModelResponse[]> = {};

    for (const m of allCachedModels) {
      if (!modelsByProvider[m.provider]) {
        modelsByProvider[m.provider] = [];
      }
      modelsByProvider[m.provider].push({
        name: m.model,
        displayName: m.displayName,
        family: m.family,
        capability: m.capability,
        lastSeen: m.lastSeen,
      });
    }

    return createSuccessResponse(c, {
      providers: Object.keys(modelsByProvider),
      totalModels: allCachedModels.length,
      modelsByProvider,
    });
  } catch (error) {
    logger.error('Failed to get all cached models', { error });
    return createInternalErrorResponse(c, 'Failed to get cached models');
  }
});

export default app;
