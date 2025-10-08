import { Hono } from 'hono';
import { getDb } from '@third-eye/db';
import { providerKeys } from '@third-eye/db/schema';
import { encryptForStorage, decryptFromStorage, testEncryption } from '@third-eye/core';
import { eq, desc } from 'drizzle-orm';
import { ProviderId } from '@third-eye/types';
import { schemas } from '../middleware/validation';
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
  createConflictResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';

const app = new Hono();

/**
 * Provider Keys Management API
 *
 * Secure storage and retrieval of encrypted API keys
 */

// Apply middleware
app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

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

    return createSuccessResponse(c, keys);
  } catch (error) {
    console.error('Failed to get provider keys:', error);
    return createInternalErrorResponse(c, 'Failed to retrieve provider keys');
  }
});

// Add new provider key
app.post('/', validateBodyWithEnvelope(schemas.providerKeyCreate), async (c) => {
  try {
    const { provider, label, apiKey, metadata } = c.get('validatedBody');

    // Check for duplicate label for same provider
    const { db } = getDb();
    const existing = await db
      .select()
      .from(providerKeys)
      .where(eq(providerKeys.label, label))
      .limit(1);

    if (existing.length > 0) {
      return createConflictResponse(c, `Provider key with label '${label}' already exists`);
    }

    // Encrypt the API key
    const encryptedKey = encryptForStorage(apiKey);

    const result = await db.insert(providerKeys).values({
      provider,
      label,
      encryptedKey,
      metadata: metadata || null,
      createdAt: new Date(),
    }).returning({
      id: providerKeys.id,
      provider: providerKeys.provider,
      label: providerKeys.label,
      metadata: providerKeys.metadata,
      createdAt: providerKeys.createdAt,
    });

    return createSuccessResponse(c, result[0], { status: 201 });
  } catch (error) {
    console.error('Failed to add provider key:', error);
    return createInternalErrorResponse(c, 'Failed to add provider key');
  }
});

// Update provider key
app.put('/:id', validateBodyWithEnvelope(schemas.providerKeyUpdate), async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const { label, apiKey, metadata } = c.get('validatedBody');

    const { db } = getDb();

    // Check if key exists
    const existing = await db
      .select()
      .from(providerKeys)
      .where(eq(providerKeys.id, id))
      .limit(1);

    if (existing.length === 0) {
      return createNotFoundResponse(c, 'Provider key', id.toString());
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

    return createSuccessResponse(c, {
      id,
      message: 'Provider key updated successfully'
    });
  } catch (error) {
    console.error('Failed to update provider key:', error);
    return createInternalErrorResponse(c, 'Failed to update provider key');
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
      return createNotFoundResponse(c, 'Provider key', id.toString());
    }

    return createSuccessResponse(c, {
      id: result[0].id,
      message: 'Provider key deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete provider key:', error);
    return createInternalErrorResponse(c, 'Failed to delete provider key');
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
      return createNotFoundResponse(c, 'Provider key', id.toString());
    }

    const key = result[0];
    const decryptedKey = decryptFromStorage(key.encryptedKey);

    return createSuccessResponse(c, {
      id: key.id,
      provider: key.provider,
      label: key.label,
      apiKey: decryptedKey,
      metadata: key.metadata,
      createdAt: key.createdAt,
    });
  } catch (error) {
    console.error('Failed to decrypt provider key:', error);
    return createInternalErrorResponse(c, 'Failed to decrypt provider key');
  }
});

// Test encryption system
app.get('/test/encryption', async (c) => {
  try {
    const isValid = testEncryption();

    return createSuccessResponse(c, {
      encryption: {
        working: isValid,
        algorithm: 'AES-256-GCM',
        keyDerivation: 'PBKDF2-SHA256',
        message: isValid ? 'Encryption system is working correctly' : 'Encryption system has issues'
      }
    });
  } catch (error) {
    console.error('Encryption test failed:', error);
    return createInternalErrorResponse(c, 'Encryption test failed');
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
      return createNotFoundResponse(c, `API key for provider: ${provider}`);
    }

    return createSuccessResponse(c, {
      ...result[0],
      available: true
    });
  } catch (error) {
    console.error('Failed to get provider key:', error);
    return createInternalErrorResponse(c, 'Failed to get provider key');
  }
});

// DELETE /api/provider-keys/:id - Delete provider key
app.delete('/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));

    if (isNaN(id)) {
      return createErrorResponse(c, {
        title: 'Invalid ID',
        status: 400,
        detail: 'Provider key ID must be a number'
      });
    }

    const { db } = getDb();

    const existing = await db
      .select()
      .from(providerKeys)
      .where(eq(providerKeys.id, id))
      .limit(1);

    if (existing.length === 0) {
      return createNotFoundResponse(c, `Provider key with ID: ${id}`);
    }

    await db
      .delete(providerKeys)
      .where(eq(providerKeys.id, id))
      .run();

    return createSuccessResponse(c, { message: 'Provider key deleted successfully' });
  } catch (error) {
    console.error('Failed to delete provider key:', error);
    return createInternalErrorResponse(c, 'Failed to delete provider key');
  }
});

export default app;