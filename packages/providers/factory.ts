import type { ProviderId, ProviderClient } from '@third-eye/types';
import { GroqProvider } from './groq.js';
import { OpenRouterProvider } from './openrouter.js';
import { OllamaProvider } from './ollama.js';
import { LMStudioProvider } from './lmstudio.js';

/**
 * Provider Factory
 *
 * Creates provider instances with configuration
 */
export class ProviderFactory {
  /**
   * Create a provider client instance
   */
  static create(providerId: ProviderId, config: any = {}): ProviderClient {
    switch (providerId) {
      case 'groq':
        return new GroqProvider(
          config.baseUrl || 'https://api.groq.com/openai/v1',
          config.apiKey
        );

      case 'openrouter':
        return new OpenRouterProvider(
          config.baseUrl || 'https://openrouter.ai/api/v1',
          config.apiKey
        );

      case 'ollama':
        return new OllamaProvider(
          config.baseUrl || 'http://127.0.0.1:11434'
        );

      case 'lmstudio':
        return new LMStudioProvider(
          config.baseUrl || 'http://127.0.0.1:1234'
        );

      default:
        throw new Error(`Unknown provider: ${providerId}`);
    }
  }

  /**
   * Get all available provider IDs
   */
  static getAvailableProviders(): ProviderId[] {
    return ['groq', 'openrouter', 'ollama', 'lmstudio'];
  }

  /**
   * Check if a provider requires an API key
   */
  static requiresApiKey(providerId: ProviderId): boolean {
    return providerId === 'groq' || providerId === 'openrouter';
  }

  /**
   * Check if a provider is local
   */
  static isLocal(providerId: ProviderId): boolean {
    return providerId === 'ollama' || providerId === 'lmstudio';
  }

  /**
   * Get default configuration for a provider
   */
  static getDefaultConfig(providerId: ProviderId): any {
    switch (providerId) {
      case 'groq':
        return {
          baseUrl: 'https://api.groq.com/openai/v1',
          apiKey: process.env.GROQ_API_KEY,
        };

      case 'openrouter':
        return {
          baseUrl: 'https://openrouter.ai/api/v1',
          apiKey: process.env.OPENROUTER_API_KEY,
        };

      case 'ollama':
        return {
          baseUrl: 'http://127.0.0.1:11434',
        };

      case 'lmstudio':
        return {
          baseUrl: 'http://127.0.0.1:1234',
        };

      default:
        return {};
    }
  }

  /**
   * Create provider with database configuration (with encrypted keys)
   * Falls back to environment variables if no database key found
   */
  static async createFromDatabase(providerId: ProviderId): Promise<ProviderClient> {
    try {
      // Try to load configuration from database
      const config = await this.getConfigFromDatabase(providerId);
      return this.create(providerId, config);
    } catch (error) {
      console.warn(`Failed to load config for ${providerId} from database, using fallback:`, error);
      // Fall back to default configuration (environment variables)
      return this.create(providerId, this.getDefaultConfig(providerId));
    }
  }

  /**
   * Load provider configuration from database with decrypted API key
   */
  static async getConfigFromDatabase(providerId: ProviderId): Promise<any> {
    try {
      // Dynamic import to avoid circular dependencies
      const { getDb } = await import('@third-eye/db');
      const { providerKeys } = await import('@third-eye/db/schema');
      const { decryptFromStorage } = await import('@third-eye/core');
      const { eq, desc } = await import('drizzle-orm');

      const { db } = getDb();

      // Get the most recent key for this provider
      const result = await db
        .select()
        .from(providerKeys)
        .where(eq(providerKeys.provider, providerId))
        .orderBy(desc(providerKeys.createdAt))
        .limit(1);

      if (result.length === 0) {
        throw new Error(`No API key found in database for provider: ${providerId}`);
      }

      const key = result[0];
      const decryptedApiKey = decryptFromStorage(key.encryptedKey);

      // Build configuration object
      const config: any = {
        apiKey: decryptedApiKey,
      };

      // Add provider-specific configuration
      switch (providerId) {
        case 'groq':
          config.baseUrl = 'https://api.groq.com/openai/v1';
          break;

        case 'openrouter':
          config.baseUrl = 'https://openrouter.ai/api/v1';
          break;

        case 'ollama':
          config.baseUrl = 'http://127.0.0.1:11434';
          break;

        case 'lmstudio':
          config.baseUrl = 'http://127.0.0.1:1234';
          break;
      }

      // Merge any metadata configuration
      if (key.metadata && typeof key.metadata === 'object') {
        Object.assign(config, key.metadata);
      }

      return config;
    } catch (error) {
      throw new Error(`Failed to load configuration for ${providerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}