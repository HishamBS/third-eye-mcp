import { Hono } from "hono";
import { ApiErrorCode, ApiErrorTitle } from "@third-eye/constants";
import { generateId } from "@third-eye/db/utils/uuid";
import { getDb } from "@third-eye/db";
import { providerKeys } from "@third-eye/db/schema";
import { encryptForStorage, testEncryption } from "@third-eye/core";
import { eq, desc } from "drizzle-orm";
import { ProviderId } from "@third-eye/types";
import { schemas, getValidatedBody } from "../middleware/validation";
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
  createConflictResponse,
  requestIdMiddleware,
  errorHandler,
} from "../middleware/response";
import { z } from "zod";

// Type inference from schemas
type ProviderKeyCreate = z.infer<typeof schemas.providerKeyCreate>;
type ProviderKeyUpdate = z.infer<typeof schemas.providerKeyUpdate>;

const app = new Hono();

/**
 * Provider Keys Management API
 *
 * Secure storage and retrieval of encrypted API keys
 */

// Apply middleware
app.use("*", requestIdMiddleware());
app.use("*", errorHandler());

// Get all provider keys (without decrypted values)
app.get("/", async (c) => {
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
    console.error("Failed to get provider keys:", error);
    return createInternalErrorResponse(c, "Failed to retrieve provider keys");
  }
});

// Add new provider key
app.post(
  "/",
  validateBodyWithEnvelope(schemas.providerKeyCreate),
  async (c) => {
    try {
      const { provider, label, apiKey, metadata } =
        getValidatedBody<ProviderKeyCreate>(c);

      // Check for duplicate label for same provider
      const { db } = getDb();
      const existing = await db
        .select()
        .from(providerKeys)
        .where(eq(providerKeys.label, label))
        .limit(1);

      if (existing.length > 0) {
        return createConflictResponse(
          c,
          `Provider key with label '${label}' already exists`,
        );
      }

      // Encrypt the API key (apiKey is required for non-local providers)
      const encryptedKey = apiKey ? encryptForStorage(apiKey) : Buffer.from("");

      // Generate UUID for new key
      const id = generateId();

      // Serialize metadata for storage
      const metadataJson = metadata ? JSON.stringify(metadata) : null;

      const result = await db
        .insert(providerKeys)
        .values({
          id,
          provider,
          label,
          encryptedKey,
          metadata: metadataJson,
          createdAt: new Date(),
        })
        .returning({
          id: providerKeys.id,
          provider: providerKeys.provider,
          label: providerKeys.label,
          metadata: providerKeys.metadata,
          createdAt: providerKeys.createdAt,
        });

      return createSuccessResponse(c, result[0], { status: 201 });
    } catch (error) {
      console.error("Failed to add provider key:", error);
      return createInternalErrorResponse(c, "Failed to add provider key");
    }
  },
);

// Update provider key
app.put(
  "/:id",
  validateBodyWithEnvelope(schemas.providerKeyUpdate),
  async (c) => {
    try {
      const id = c.req.param("id"); // String UUID, not parseInt
      const { label, apiKey, metadata } =
        getValidatedBody<ProviderKeyUpdate>(c);

      const { db } = getDb();

      // Check if key exists
      const existing = await db
        .select()
        .from(providerKeys)
        .where(eq(providerKeys.id, id))
        .limit(1);

      if (existing.length === 0) {
        return createNotFoundResponse(c, "Provider key", id);
      }

      // Build update object with proper types
      const updateData: Partial<{
        label: string;
        metadata: string | null;
        encryptedKey: Buffer;
      }> = {};

      if (label) updateData.label = label;
      if (metadata !== undefined) {
        updateData.metadata = metadata ? JSON.stringify(metadata) : null;
      }
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
        message: "Provider key updated successfully",
      });
    } catch (error) {
      console.error("Failed to update provider key:", error);
      return createInternalErrorResponse(c, "Failed to update provider key");
    }
  },
);

// Delete provider key
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id"); // String UUID, not parseInt

    if (!id) {
      return createErrorResponse(c, {
        title: ApiErrorTitle.INVALID_ID,
        code: ApiErrorCode.INVALID_ID,
        status: 400,
        detail: "Provider key ID is required",
      });
    }

    const { db } = getDb();

    // Check if key exists before deleting
    const existing = await db
      .select({ id: providerKeys.id })
      .from(providerKeys)
      .where(eq(providerKeys.id, id))
      .limit(1);

    if (existing.length === 0) {
      return createNotFoundResponse(c, "Provider key", id);
    }

    await db.delete(providerKeys).where(eq(providerKeys.id, id));

    return createSuccessResponse(c, {
      id,
      message: "Provider key deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete provider key:", error);
    return createInternalErrorResponse(c, "Failed to delete provider key");
  }
});

// Test encryption system
app.get("/test/encryption", async (c) => {
  try {
    const isValid = testEncryption();

    return createSuccessResponse(c, {
      encryption: {
        working: isValid,
        algorithm: "AES-256-GCM",
        keyDerivation: "PBKDF2-SHA256",
        message: isValid
          ? "Encryption system is working correctly"
          : "Encryption system has issues",
      },
    });
  } catch (error) {
    console.error("Encryption test failed:", error);
    return createInternalErrorResponse(c, "Encryption test failed");
  }
});

// Get provider key by provider ID (for configuration lookup)
app.get("/by-provider/:provider", async (c) => {
  try {
    const provider = c.req.param("provider") as ProviderId;

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
      available: true,
    });
  } catch (error) {
    console.error("Failed to get provider key:", error);
    return createInternalErrorResponse(c, "Failed to get provider key");
  }
});

export default app;
