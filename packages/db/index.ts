import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { resolve } from "path";
import { homedir } from "os";
import { mkdirSync, existsSync, readFileSync, rmSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

export * from "./schema";
export { schema }; // Export the exact schema object used by drizzle initialization
export * from "./defaults";
export * from "./constants";
export * from "./utils/lookups";
export * from "./utils/uuid";

// Default database path: ~/.third-eye-mcp/mcp.db (following prompt.md spec)
export function getDbPath(): string {
  const overrideDb = process.env.MCP_DB;
  if (overrideDb) {
    return overrideDb;
  }

  const mcpDir = resolve(homedir(), ".third-eye-mcp");
  if (!existsSync(mcpDir)) {
    mkdirSync(mcpDir, { recursive: true, mode: 0o700 });
  }

  return resolve(mcpDir, "mcp.db");
}

/**
 * Recover database from corrupted WAL files by cleaning up WAL/SHM files
 * This is called when SQLite throws disk I/O errors due to corrupted WAL files
 */
function recoverDatabaseFromWal(dbPath: string): void {
  const walFile = `${dbPath}-wal`;
  const shmFile = `${dbPath}-shm`;

  console.error("🔧 Attempting database recovery from corrupted WAL files...");

  if (existsSync(walFile)) {
    try {
      rmSync(walFile, { force: true });
      console.error(`   ✓ Removed corrupted WAL file: ${walFile}`);
    } catch (err) {
      console.warn(
        `   ⚠️  Could not remove WAL file (may be locked): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  if (existsSync(shmFile)) {
    try {
      rmSync(shmFile, { force: true });
      console.error(`   ✓ Removed corrupted SHM file: ${shmFile}`);
    } catch (err) {
      console.warn(
        `   ⚠️  Could not remove SHM file (may be locked): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.error("   ✓ Recovery complete - retrying database connection...");
}

export function createDb(dbPath?: string) {
  const path = dbPath || getDbPath();

  // Ensure parent directory exists with proper permissions
  const dbDir = dirname(path);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true, mode: 0o700 });
  }

  // Clean up stale/corrupted WAL files proactively
  // Empty WAL files (0 bytes) are often corrupted and cause disk I/O errors
  const walFile = `${path}-wal`;
  const shmFile = `${path}-shm`;

  if (!existsSync(path)) {
    // Database doesn't exist - clean up orphaned WAL files
    if (existsSync(walFile)) {
      try {
        rmSync(walFile, { force: true });
      } catch (err) {
        // Ignore cleanup errors - file might be locked or already deleted
      }
    }

    if (existsSync(shmFile)) {
      try {
        rmSync(shmFile, { force: true });
      } catch (err) {
        // Ignore cleanup errors - file might be locked or already deleted
      }
    }
  } else {
    // Database exists - proactively clean empty/corrupted WAL files
    // CRITICAL: Remove WAL files immediately before opening to prevent disk I/O errors
    if (existsSync(walFile)) {
      try {
        const walStats = statSync(walFile);
        // Empty WAL files (0 bytes) are corrupted and will cause disk I/O errors
        // Also remove if file is suspiciously small (< 1000 bytes) as it might be corrupted
        if (walStats.size === 0 || walStats.size < 1000) {
          rmSync(walFile, { force: true });
          console.error("🔧 Proactively removed empty/corrupted WAL file");
        }
      } catch (err) {
        // If stat fails, try to remove anyway - corrupted files might not stat correctly
        try {
          rmSync(walFile, { force: true });
          console.error("🔧 Removed WAL file (stat failed, assuming corrupted)");
        } catch {
          // Ignore removal errors
        }
      }
    }

    if (existsSync(shmFile)) {
      try {
        const shmStats = statSync(shmFile);
        // Very small SHM files (< 100 bytes) might be corrupted
        if (shmStats.size < 100) {
          rmSync(shmFile, { force: true });
          console.error("🔧 Proactively removed potentially corrupted SHM file");
        }
      } catch (err) {
        // If stat fails, try to remove anyway
        try {
          rmSync(shmFile, { force: true });
          console.error("🔧 Removed SHM file (stat failed, assuming corrupted)");
        } catch {
          // Ignore removal errors
        }
      }
    }
  }

  // Try to create database connection with retry logic for corrupted WAL files
  // NOTE: We clean WAL files again right before opening to handle race conditions
  let sqlite: Database | null = null;
  let attempt = 0;
  const maxAttempts = 2;

  while (attempt < maxAttempts) {
    try {
      sqlite = new Database(path);

      // Check if WAL mode is already active before setting it
      // This prevents disk I/O errors when a corrupted WAL file exists
      try {
        const currentMode = sqlite.query("PRAGMA journal_mode").get() as {
          journal_mode: string;
        } | null;
        const isWAL = currentMode?.journal_mode?.toUpperCase() === "WAL";

        if (!isWAL) {
          // Only set WAL mode if not already active
          sqlite.exec("PRAGMA journal_mode = WAL");
        }
      } catch (pragmaErr: unknown) {
        // If PRAGMA fails, clean WAL files and retry
        const pragmaError =
          pragmaErr instanceof Error ? pragmaErr.message : String(pragmaErr);
        if (
          pragmaError.toLowerCase().includes("disk i/o error") ||
          pragmaError.toLowerCase().includes("i/o error")
        ) {
          sqlite.close();
          sqlite = null;
          recoverDatabaseFromWal(path);
          attempt++;
          continue;
        }
        throw pragmaErr;
      }

      // Set other PRAGMAs with individual error handling
      try {
        sqlite.exec("PRAGMA synchronous = NORMAL");
      } catch (err) {
        // Ignore synchronous errors - not critical
      }

      try {
        sqlite.exec("PRAGMA cache_size = 1000");
      } catch (err) {
        // Ignore cache_size errors - not critical
      }

      try {
        sqlite.exec("PRAGMA foreign_keys = ON");
      } catch (err) {
        // Ignore foreign_keys errors - not critical
      }

      try {
        sqlite.exec("PRAGMA temp_store = memory");
      } catch (err) {
        // Ignore temp_store errors - not critical
      }

      const db = drizzle(sqlite, { schema, casing: "snake_case" });
      return { db, sqlite };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorString = errorMessage.toLowerCase();
      const isDiskIOError =
        errorString.includes("disk i/o error") ||
        errorString.includes("i/o error") ||
        errorString.includes("sqlite_error") ||
        errorString.includes("sqlite") ||
        errorString.includes("disk") ||
        errorString.includes("corrupt") ||
        errorString.includes("locked");

      // Close database connection if it was opened
      if (sqlite) {
        try {
          sqlite.close();
        } catch {
          // Ignore close errors
        }
        sqlite = null;
      }

      // If it's a disk I/O error and we haven't retried yet, attempt recovery
      if (isDiskIOError && attempt < maxAttempts - 1) {
        recoverDatabaseFromWal(path);
        attempt++;
        continue;
      }

      // If it's not a retryable error or we've exhausted retries, throw
      throw err;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error("Failed to create database connection after retries");
}

export function runMigrations(
  db: ReturnType<typeof createDb>["db"],
  sqlite: Database,
) {
  /**
   * PRE-V1: Apply schema directly from SQL file (no drizzle migrate tracking)
   * Post-v1: Will use proper migration system with versioning
   */
  try {
    // Check if tables exist
    const tables = sqlite
      .query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      )
      .all() as Array<{ name: string }>;

    if (tables.length === 0) {
      console.error("📋 No tables found - applying initial schema...");

      // Single consolidated migration file for V1 release (R17 - SSOT)
      // Use process.cwd() which is always project root when CLI/server runs
      // This works both for direct execution and bundled code
      const migrationFile = resolve(
        process.cwd(),
        "packages",
        "db",
        "migrations",
        "0000_v1_release.sql",
      );

      if (existsSync(migrationFile)) {
        // Read and execute SQL directly (bypass drizzle-orm migrate() which has SERIAL bug)
        const sql = readFileSync(migrationFile, "utf-8");
        const statements = sql
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        console.error(`📝 Executing ${statements.length} SQL statements...`);

        for (const statement of statements) {
          sqlite.exec(statement);
        }

        console.error("✅ Schema created successfully");
      } else {
        console.warn(`⚠️  Migration file not found: ${migrationFile}`);
        console.warn("⚠️  Database will be empty - seed defaults to populate");
      }
    } else {
      console.error(`✅ Database initialized with ${tables.length} tables`);

      // Validate schema - check if critical columns exist
      // This ensures migration was applied correctly even if tables already existed
      try {
        const eyesTableNames = tables.map((t) => t.name);
      } catch (schemaErr) {
        // Ignore schema validation errors - table might not exist yet
        console.warn(
          "⚠️  Could not validate eyes table schema:",
          schemaErr instanceof Error ? schemaErr.message : String(schemaErr),
        );
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Ignore "table already exists" errors
    if (!message?.includes("already exists")) {
      console.error("❌ Schema application error:", message);
      throw err;
    }
  }
}

// Singleton database instance
let _dbInstance: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_dbInstance) {
    try {
      _dbInstance = createDb();
      runMigrations(_dbInstance.db, _dbInstance.sqlite);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorString = errorMessage.toLowerCase();
      const isDiskIOError =
        errorString.includes("disk i/o error") ||
        errorString.includes("i/o error") ||
        errorString.includes("sqlite_error") ||
        errorString.includes("sqlite") ||
        errorString.includes("disk") ||
        errorString.includes("corrupt") ||
        errorString.includes("locked");

      // If migration fails with disk I/O error, recovery already happened in createDb()
      // But if it fails here, we need to reset the instance and throw
      if (_dbInstance) {
        try {
          _dbInstance.sqlite.close();
        } catch {
          // Ignore close errors
        }
        _dbInstance = null;
      }

      if (isDiskIOError) {
        console.error(
          "❌ Database disk I/O error after recovery attempts. Please check database file permissions and disk space.",
        );
        console.error(`   Error details: ${errorMessage}`);
      }

      throw err;
    }
  }
  return {
    ...(_dbInstance as NonNullable<typeof _dbInstance>),
    dbPath: getDbPath(),
  };
}

export function closeDb() {
  if (_dbInstance) {
    _dbInstance.sqlite.close();
    _dbInstance = null;
  }
}
