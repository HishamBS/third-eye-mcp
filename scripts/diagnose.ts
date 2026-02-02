#!/usr/bin/env bun
/**
 * Third Eye MCP Diagnostic Script
 * Run with: bun run scripts/diagnose.ts
 *
 * Tests each component individually to identify where the timeout is occurring
 */

console.log("🔍 Third Eye MCP Diagnostic\n");

async function measure<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T | null> {
  const start = Date.now();
  console.log(`⏱️  Testing: ${name}...`);
  try {
    const result = await fn();
    const elapsed = Date.now() - start;
    console.log(`   ✅ ${name}: ${elapsed}ms\n`);
    return result;
  } catch (error) {
    const elapsed = Date.now() - start;
    console.log(`   ❌ ${name}: FAILED after ${elapsed}ms`);
    console.log(
      `   Error: ${error instanceof Error ? error.message : error}\n`,
    );
    return null;
  }
}

async function diagnose() {
  // Test 1: Database connection
  const db = await measure("Database Connection", async () => {
    const { getDb } = await import("@third-eye/db");
    return getDb();
  });

  if (!db) {
    console.log("❌ Cannot continue without database connection");
    return;
  }

  // Test 2: Database queries
  await measure("Count Eyes", async () => {
    const { eyes } = await import("@third-eye/db");
    const { count } = await import("drizzle-orm");
    const result = await db.db.select({ value: count() }).from(eyes).get();
    console.log(`   Found: ${result?.value ?? 0} eyes`);
    return result;
  });

  await measure("Count Personas", async () => {
    const { personas } = await import("@third-eye/db");
    const { count } = await import("drizzle-orm");
    const result = await db.db.select({ value: count() }).from(personas).get();
    console.log(`   Found: ${result?.value ?? 0} personas`);
    return result;
  });

  await measure("Count Provider Keys", async () => {
    const { providerKeys } = await import("@third-eye/db");
    const { count } = await import("drizzle-orm");
    const result = await db.db
      .select({ value: count() })
      .from(providerKeys)
      .get();
    console.log(`   Found: ${result?.value ?? 0} provider keys`);
    return result;
  });

  // Test 3: Eye routing lookup
  await measure("Get Overseer Eye Routing", async () => {
    const { eyesRouting } = await import("@third-eye/db");
    const { getEyeIdByName } = await import("@third-eye/db/utils/lookups");
    const { eq } = await import("drizzle-orm");

    const eyeId = await getEyeIdByName("overseer");
    if (!eyeId) {
      throw new Error("Overseer eye not found in database");
    }
    console.log(`   Overseer eyeId: ${eyeId}`);

    const routing = await db.db
      .select()
      .from(eyesRouting)
      .where(eq(eyesRouting.eyeId, eyeId))
      .get();

    if (!routing) {
      throw new Error("No routing config for Overseer");
    }
    console.log(
      `   Provider: ${routing.primaryProvider}, Model: ${routing.primaryModel}`,
    );
    return routing;
  });

  // Test 4: Provider credentials
  await measure("Get Provider Credentials", async () => {
    const { providerKeys } = await import("@third-eye/db");
    const { eq } = await import("drizzle-orm");
    const { decryptFromStorage } = await import("@third-eye/core/encryption");

    const result = await db.db
      .select()
      .from(providerKeys)
      .where(eq(providerKeys.provider, "groq"))
      .get();

    if (!result) {
      throw new Error("No Groq provider key in database");
    }

    // Try to decrypt (just test if it works, don't log the key)
    const encrypted = result.encryptedKey;
    const apiKey =
      encrypted instanceof Uint8Array
        ? decryptFromStorage(Buffer.from(encrypted))
        : null;

    if (!apiKey) {
      throw new Error("Failed to decrypt Groq API key");
    }
    console.log(`   Groq API key: ${apiKey.substring(0, 10)}...`);
    return { hasKey: true };
  });

  // Test 5: Groq API health check
  await measure("Groq API Health Check", async () => {
    const { ProviderFactory } = await import("@third-eye/providers");
    const { providerKeys } = await import("@third-eye/db");
    const { eq } = await import("drizzle-orm");
    const { decryptFromStorage } = await import("@third-eye/core/encryption");

    const result = await db.db
      .select()
      .from(providerKeys)
      .where(eq(providerKeys.provider, "groq"))
      .get();

    if (!result) {
      throw new Error("No Groq provider key");
    }

    const encrypted = result.encryptedKey;
    const apiKey =
      encrypted instanceof Uint8Array
        ? decryptFromStorage(Buffer.from(encrypted))
        : null;

    if (!apiKey) {
      throw new Error("Failed to decrypt API key");
    }

    const provider = ProviderFactory.createProvider("groq", { apiKey });
    const health = await provider.health();

    if (!health.healthy) {
      throw new Error(`Groq unhealthy: ${health.error}`);
    }
    console.log(`   Latency: ${health.latency_ms}ms`);
    return health;
  });

  // Test 6: Persona blueprint loading
  await measure("Load Overseer Blueprint", async () => {
    const { getPersonaBlueprint } = await import("@third-eye/eyes");
    const { getEyeIdByName } = await import("@third-eye/db/utils/lookups");

    const eyeId = await getEyeIdByName("overseer");
    if (!eyeId) {
      throw new Error("Overseer eye not found");
    }

    const blueprint = await getPersonaBlueprint(eyeId);
    if (!blueprint) {
      throw new Error("No blueprint for Overseer");
    }
    console.log(`   Blueprint loaded: ${blueprint.eyeName}`);
    return blueprint;
  });

  // Test 7: Full autoRouter analyzeTask (this is what times out)
  await measure("AutoRouter analyzeTask (10s timeout)", async () => {
    const { autoRouter } = await import("@third-eye/core");

    // Add a 10-second timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timeout after 10 seconds")), 10000);
    });

    const taskPromise = autoRouter.analyzeTask("test connection");

    return Promise.race([taskPromise, timeoutPromise]);
  });

  console.log("\n🎉 Diagnostic complete!");
}

diagnose().catch((error) => {
  console.error("\n💥 Diagnostic failed:", error);
  process.exit(1);
});
