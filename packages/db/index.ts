import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import { resolve } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

export * from './schema';
export { schema }; // Export the exact schema object used by drizzle initialization
export * from './defaults';

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
  /**
   * PRE-V1: Apply schema directly from SQL file (no drizzle migrate tracking)
   * Post-v1: Will use proper migration system with versioning
   */
  try {
    // Check if tables exist
    const tables = sqlite.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    
    if (tables.length === 0) {
      console.log('📋 No tables found - applying initial schema...');
      
      // Single consolidated migration file for V1 release (R17 - SSOT)
      // Always use source directory for migrations (not dist)
      // Migration SQL files are not compiled, they must be read from source
      const sourceRoot = resolve(__dirname, '../../../../'); // From dist/packages/db to project root
      const migrationFile = resolve(sourceRoot, 'packages/db/migrations/0000_v1_release.sql');
      
      if (existsSync(migrationFile)) {
        // Read and execute SQL directly (bypass drizzle-orm migrate() which has SERIAL bug)
        const sql = readFileSync(migrationFile, 'utf-8');
        const statements = sql
          .split('--> statement-breakpoint')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        console.log(`📝 Executing ${statements.length} SQL statements...`);
        
        for (const statement of statements) {
          sqlite.exec(statement);
        }
        
        console.log('✅ Schema created successfully');
      } else {
        console.warn(`⚠️  Migration file not found: ${migrationFile}`);
        console.warn('⚠️  Database will be empty - seed defaults to populate');
      }
    } else {
      console.log(`✅ Database initialized with ${tables.length} tables`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Ignore "table already exists" errors
    if (!message?.includes('already exists')) {
      console.error('❌ Schema application error:', message);
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