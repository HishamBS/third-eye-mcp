import { Hono } from 'hono';
import { getDb } from '@third-eye/db';
import { providerKeys } from '@third-eye/db/schema';
import { encryptForStorage, decryptFromStorage, testEncryption } from '@third-eye/core';
import { eq, desc } from 'drizzle-orm';
import { ProviderId } from '@third-eye/types';

const app = new Hono();

/**
 * Provider Keys Management API
 *
 * Secure storage and retrieval of encrypted API keys
 */

// Get all provider keys (without decrypted values)
app.get('/', async (c) => {
  try {
    const { db } = getDb();
    const keys = await db
      .select({
        id: providerKeys.id,
        provider: providerKeys.provider,
        label: providerKeys.label,
        metadata: providerKeys.metadata,
        createdAt: providerKeys.createdAt,
      })
      .from(providerKeys)
      .orderBy(desc(providerKeys.createdAt));

    return c.json(keys);
  } catch (error) {
    console.error('Failed to get provider keys:', error);
    return c.json({ error: 'Failed to get provider keys' }, 500);
  }
});

// Add new provider key
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { provider, label, apiKey, metadata } = body;

    // Validate required fields
    if (!provider || !label || !apiKey) {
      return c.json({
        error: 'Missing required fields: provider, label, apiKey'
      }, 400);
    }

    // Validate provider ID
    const validProviders: ProviderId[] = ['groq', 'openrouter', 'ollama', 'lmstudio'];
    if (!validProviders.includes(provider)) {
      return c.json({
        error: `Invalid provider. Must be one of: ${validProviders.join(', ')}`
      }, 400);
    }

    // Encrypt the API key
    const encryptedKey = encryptForStorage(apiKey);

    const { db } = getDb();
    const result = await db.insert(providerKeys).values({
      provider,
      label,
      encryptedKey,
      metadata: metadata || null,
      createdAt: new Date(),
    }).returning({ id: providerKeys.id });

    return c.json({
      success: true,
      id: result[0].id,
      message: 'Provider key added successfully'
    });
  } catch (error) {
    console.error('Failed to add provider key:', error);
    return c.json({ error: 'Failed to add provider key' }, 500);
  }
});

// Update provider key
app.put('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { label, apiKey, metadata } = body;

    if (!label && !apiKey && !metadata) {
      return c.json({
        error: 'At least one field (label, apiKey, metadata) must be provided'
      }, 400);
    }

    const { db } = getDb();

    // Check if key exists
    const existing = await db
      .select()
      .from(providerKeys)
      .where(eq(providerKeys.id, id))
      .limit(1);

    if (existing.length === 0) {
      return c.json({ error: 'Provider key not found' }, 404);
    }

    // Build update object
    const updateData: any = {};

    if (label) updateData.label = label;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (apiKey) {
      // Encrypt new API key
      updateData.encryptedKey = encryptForStorage(apiKey);
    }

    await db
      .update(providerKeys)
      .set(updateData)
      .where(eq(providerKeys.id, id));

    return c.json({
      success: true,
      message: 'Provider key updated successfully'
    });
  } catch (error) {
    console.error('Failed to update provider key:', error);
    return c.json({ error: 'Failed to update provider key' }, 500);
  }
});

// Delete provider key
app.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const { db } = getDb();
    const result = await db
      .delete(providerKeys)
      .where(eq(providerKeys.id, id))
      .returning({ id: providerKeys.id });

    if (result.length === 0) {
      return c.json({ error: 'Provider key not found' }, 404);
    }

    return c.json({
      success: true,
      message: 'Provider key deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete provider key:', error);
    return c.json({ error: 'Failed to delete provider key' }, 500);
  }
});

// Get decrypted API key (for internal use only)
app.get('/:id/decrypt', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    const { db } = getDb();
    const result = await db
      .select()
      .from(providerKeys)
      .where(eq(providerKeys.id, id))
      .limit(1);

    if (result.length === 0) {
      return c.json({ error: 'Provider key not found' }, 404);
    }

    const key = result[0];
    const decryptedKey = decryptFromStorage(key.encryptedKey);

    return c.json({
      id: key.id,
      provider: key.provider,
      label: key.label,
      apiKey: decryptedKey,
      metadata: key.metadata,
      createdAt: key.createdAt,
    });
  } catch (error) {
    console.error('Failed to decrypt provider key:', error);
    return c.json({ error: 'Failed to decrypt provider key' }, 500);
  }
});

// Test encryption system
app.get('/test/encryption', async (c) => {
  try {
    const isValid = testEncryption();

    return c.json({
      encryption: {
        working: isValid,
        algorithm: 'AES-256-GCM',
        keyDerivation: 'PBKDF2-SHA256',
        message: isValid ? 'Encryption system is working correctly' : 'Encryption system has issues'
      }
    });
  } catch (error) {
    console.error('Encryption test failed:', error);
    return c.json({
      error: 'Encryption test failed',
      encryption: { working: false }
    }, 500);
  }
});

// Get provider key by provider ID (for configuration lookup)
app.get('/by-provider/:provider', async (c) => {
  try {
    const provider = c.req.param('provider') as ProviderId;

    const { db } = getDb();
    const result = await db
      .select({
        id: providerKeys.id,
        provider: providerKeys.provider,
        label: providerKeys.label,
        metadata: providerKeys.metadata,
        createdAt: providerKeys.createdAt,
      })
      .from(providerKeys)
      .where(eq(providerKeys.provider, provider))
      .orderBy(desc(providerKeys.createdAt))
      .limit(1);

    if (result.length === 0) {
      return c.json({
        error: `No API key found for provider: ${provider}`,
        provider,
        available: false
      }, 404);
    }

    return c.json({
      ...result[0],
      available: true
    });
  } catch (error) {
    console.error('Failed to get provider key:', error);
    return c.json({ error: 'Failed to get provider key' }, 500);
  }
});

export default app;