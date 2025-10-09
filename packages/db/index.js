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
export function getDbPath() {
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
export function createDb(dbPath) {
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
export function runMigrations(db, sqlite) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const migrationsFolder = resolve(__dirname, 'migrations');
    try {
        // Only run migrations if folder exists
        if (existsSync(migrationsFolder)) {
            // Drizzle-kit tracks migrations in __drizzle_migrations table
            // Just run the migrate command - it will handle which ones to apply
            migrate(db, { migrationsFolder });
        }
    }
    catch (err) {
        // Ignore "table already exists" errors during migration
        if (!err.message?.includes('already exists')) {
            console.warn('Migration warning:', err.message);
        }
    }
}
// Singleton database instance
let _dbInstance = null;
export function getDb() {
    if (!_dbInstance) {
        _dbInstance = createDb();
        runMigrations(_dbInstance.db, _dbInstance.sqlite);
    }
    return { ..._dbInstance, dbPath: getDbPath() };
}
export function closeDb() {
    if (_dbInstance) {
        _dbInstance.sqlite.close();
        _dbInstance = null;
    }
}
//# sourceMappingURL=index.js.map