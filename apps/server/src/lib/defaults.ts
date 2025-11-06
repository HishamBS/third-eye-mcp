import { getDb } from '@third-eye/db';
import { appSettings } from '@third-eye/db';
import { eq } from 'drizzle-orm';

/**
 * Default Routing Configuration - SSOT Helper
 * 
 * Provides default routing values that can be overridden by app_settings
 * Database is the single source of truth for all configuration
 */

export interface DefaultRouting {
  primaryProvider: string;
  primaryModel: string;
  fallbackProvider: string;
  fallbackModel: string;
}

/**
 * Get default routing configuration
 * 
 * Checks app_settings table first, then falls back to system defaults
 */
export async function getDefaultRouting(): Promise<DefaultRouting> {
  const { db } = getDb();
  
  // Try to get from app_settings
  const defaultRoutingSetting = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, 'default_routing'))
    .get();
  
  if (defaultRoutingSetting?.value) {
    try {
      const parsed = JSON.parse(defaultRoutingSetting.value as string) as DefaultRouting;
      // Validate structure
      if (
        typeof parsed.primaryProvider === 'string' &&
        typeof parsed.primaryModel === 'string' &&
        typeof parsed.fallbackProvider === 'string' &&
        typeof parsed.fallbackModel === 'string'
      ) {
        return parsed;
      }
    } catch (e) {
      console.warn('[Defaults] Failed to parse default_routing from app_settings, using system defaults');
    }
  }
  
  // System defaults (fallback only)
  return {
    primaryProvider: 'groq',
    primaryModel: 'llama-3.3-70b-versatile',
    fallbackProvider: 'openrouter',
    fallbackModel: 'anthropic/claude-3.5-sonnet',
  };
}

