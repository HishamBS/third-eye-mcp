import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import * as schema from './schema.js';
import { resolve } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

export * from './schema.js';

// Default database path: ~/.third-eye-mcp/mcp.db (following prompt.md spec)
export function getDbPath(): string {
  const overrideDb = process.env.MCP_DB;
  if (overrideDb) {
    return overrideDb;
  }

  const mcpDir = resolve(homedir(), '.third-eye-mcp');
  if (!existsSync(mcpDir)) {
    mkdirSync(mcpDir, { recursive: true, mode: 0o700 });
  }

  return resolve(mcpDir, 'mcp.db');
}

export function createDb(dbPath?: string) {
  const path = dbPath || getDbPath();

  // Ensure parent directory exists with proper permissions
  const dbDir = dirname(path);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true, mode: 0o700 });
  }

  const sqlite = new Database(path);

  // Enable WAL mode for better concurrency
  sqlite.exec('PRAGMA journal_mode = WAL');
  sqlite.exec('PRAGMA synchronous = NORMAL');
  sqlite.exec('PRAGMA cache_size = 1000');
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec('PRAGMA temp_store = memory');

  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}

export function runMigrations(db: ReturnType<typeof createDb>['db'], sqlite: Database) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const migrationsFolder = resolve(__dirname, 'migrations');

  try {
    // Only run migrations if folder exists
    if (existsSync(migrationsFolder)) {
      // Drizzle-kit tracks migrations in __drizzle_migrations table
      // Just run the migrate command - it will handle which ones to apply
      migrate(db, { migrationsFolder });

      // Verify migrations ran
      const tables = sqlite.query("SELECT name FROM sqlite_master WHERE type='table'").all();
      if (tables.length === 0) {
        throw new Error('Migrations ran but no tables created - migration files may be empty');
      }
    } else {
      console.warn(`⚠️  Migrations folder not found: ${migrationsFolder}`);
    }
  } catch (err: any) {
    // Ignore "table already exists" errors during migration
    if (!err.message?.includes('already exists')) {
      console.error('❌ Migration error:', err.message);
      throw err;
    }
  }
}

// Singleton database instance
let _dbInstance: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_dbInstance) {
    _dbInstance = createDb();
    runMigrations(_dbInstance.db, _dbInstance.sqlite);
  }
  return { ...(_dbInstance as NonNullable<typeof _dbInstance>), dbPath: getDbPath() };
}

export function closeDb() {
  if (_dbInstance) {
    _dbInstance.sqlite.close();
    _dbInstance = null;
  }
}