import { getDb } from '@third-eye/db';
import { getConfig } from '@third-eye/config';
import { ProviderFactory } from '@third-eye/providers';
import type { ProviderId } from '@third-eye/types';

interface HealthCheckResult {
  ok: boolean;
  latency_ms?: number;
  error?: string;
}

interface ProviderHealth {
  [key: string]: boolean;
}

// Cache health check results for 5 seconds
const healthCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

function getCached<T>(key: string): T | null {
  const cached = healthCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result as T;
  }
  return null;
}

function setCache(key: string, result: any) {
  healthCache.set(key, { result, timestamp: Date.now() });
}

/**
 * Check database health by running a test query
 */
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const cached = getCached<HealthCheckResult>('db');
  if (cached) return cached;

  const startTime = Date.now();

  try {
    const { sqlite } = getDb();

    sqlite.query('SELECT 1').get();

    const latency = Date.now() - startTime;
    const result = { ok: true, latency_ms: latency };

    setCache('db', result);
    return result;
  } catch (error) {
    const result = {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    setCache('db', result);
    return result;
  }
}

/**
 * Check provider health by attempting to list models
 */
export async function checkProviderHealth(providerId: ProviderId): Promise<boolean> {
  const cacheKey = `provider_${providerId}`;
  const cached = getCached<boolean>(cacheKey);
  if (cached !== null) return cached;

  try {
    const config = getConfig();
    const providerConfig = config.providers[providerId];

    if (!providerConfig) {
      setCache(cacheKey, false);
      return false;
    }

    const provider = ProviderFactory.create(providerId, providerConfig);

    // Try to list models as a health check
    const models = await provider.listModels();

    const isHealthy = models.length > 0;
    setCache(cacheKey, isHealthy);

    return isHealthy;
  } catch (error) {
    console.error(`Provider ${providerId} health check failed:`, error);
    setCache(cacheKey, false);
    return false;
  }
}

/**
 * Check all configured providers' health
 */
export async function checkAllProvidersHealth(): Promise<ProviderHealth> {
  const config = getConfig();
  const providers: ProviderId[] = Object.keys(config.providers) as ProviderId[];

  const results: ProviderHealth = {};

  // Check all providers in parallel
  await Promise.all(
    providers.map(async (providerId) => {
      results[providerId] = await checkProviderHealth(providerId);
    })
  );

  return results;
}

/**
 * Get overall system health
 */
export async function getSystemHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'down';
  database: HealthCheckResult;
  providers: ProviderHealth;
  uptime_seconds: number;
  version: string;
  bindAddress: string;
  host: string;
}> {
  const [dbHealth, providersHealth] = await Promise.all([
    checkDatabaseHealth(),
    checkAllProvidersHealth(),
  ]);

  // Determine overall status
  let status: 'healthy' | 'degraded' | 'down';

  if (!dbHealth.ok) {
    status = 'down';
  } else {
    const healthyProviders = Object.values(providersHealth).filter(Boolean).length;
    const totalProviders = Object.keys(providersHealth).length;

    if (healthyProviders === 0 && totalProviders > 0) {
      status = 'degraded';
    } else if (healthyProviders < totalProviders) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
  }

  // Calculate uptime
  const uptime_seconds = Math.floor(process.uptime());

  // Get version from package.json or environment
  const version = process.env.npm_package_version || '1.0.0';

  const { server } = getConfig();
  const host = server.host;
  const bindAddress = host;

  return {
    status,
    database: dbHealth,
    providers: providersHealth,
    uptime_seconds,
    version,
    bindAddress,
    host,
  };
}
