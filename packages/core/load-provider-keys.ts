/**
 * Load provider keys from database into config at runtime
 */
import { getDb } from '@third-eye/db';
import { providerKeys } from '@third-eye/db/schema';
import { decryptFromStorage } from './encryption';
import { getConfig } from '@third-eye/config';

let keysLoaded = false;

export async function loadProviderKeysIntoConfig(): Promise<void> {
  if (keysLoaded) return;

  try {
    const { db } = getDb();
    const keys = await db.select().from(providerKeys).all();
    const config = getConfig();

    console.log(`🔑 Loading ${keys.length} provider keys from database...`);

    for (const key of keys) {
      const provider = key.provider as 'groq' | 'openrouter' | 'ollama' | 'lmstudio';

      try {
        // Decrypt the API key
        const decryptedKey = decryptFromStorage(key.encryptedKey as Buffer);

        // Initialize provider config with defaults if needed
        if (!config.providers[provider]) {
          if (provider === 'groq') {
            config.providers[provider] = { baseUrl: 'https://api.groq.com/openai/v1', apiKey: decryptedKey };
          } else if (provider === 'openrouter') {
            config.providers[provider] = { baseUrl: 'https://openrouter.ai/api/v1', apiKey: decryptedKey };
          } else if (provider === 'ollama') {
            config.providers[provider] = { baseUrl: 'http://127.0.0.1:11434' };
          } else if (provider === 'lmstudio') {
            config.providers[provider] = { baseUrl: 'http://127.0.0.1:1234' };
          }
        } else {
          (config.providers[provider] as any).apiKey = decryptedKey;
        }

        console.log(`  ✓ ${provider}`);
      } catch (decryptError) {
        console.error(`  ✗ ${provider}:`, decryptError);
      }
    }

    keysLoaded = true;
  } catch (error) {
    console.error('⚠️  Failed to load provider keys:', error);
  }
}
