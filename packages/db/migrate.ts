#!/usr/bin/env bun
/**
 * Database Migration Runner
 *
 * Applies all pending migrations to the database
 */

import { drizzle } from 'drizzle-orm/bun-sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { Database } from 'bun:sqlite';
import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';

// Resolve database path - following prompt.md spec
const DB_PATH = process.env.MCP_DB || resolve(homedir(), '.third-eye-mcp/mcp.db');
const DB_DIR = DB_PATH.substring(0, DB_PATH.lastIndexOf('/'));
const MIGRATIONS_DIR = resolve(import.meta.dir, 'migrations');

console.log('🔄 Running database migrations...');
console.log(`   Database: ${DB_PATH}`);
console.log(`   Migrations: ${MIGRATIONS_DIR}`);

// Ensure database directory exists
if (!existsSync(DB_DIR)) {
  console.log(`📁 Creating database directory: ${DB_DIR}`);
  mkdirSync(DB_DIR, { recursive: true });
}

// Check if migrations directory exists
if (!existsSync(MIGRATIONS_DIR)) {
  console.error(`❌ Migrations directory not found: ${MIGRATIONS_DIR}`);
  console.error('   Run `bun run db:generate` first to create migrations');
  process.exit(1);
}

try {
  // Connect to database
  const sqlite = new Database(DB_PATH);
  const db = drizzle(sqlite);

  console.log('📦 Applying migrations...');

  // Run migrations with explicit logging
  migrate(db, {
    migrationsFolder: MIGRATIONS_DIR,
  });

  // Verify migrations ran by checking for tables
  const tables = sqlite.query("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log(`   ✓ Found ${tables.length} tables in database`);

  console.log('✅ Migrations completed successfully!');

  // Close connection
  sqlite.close();
} catch (error) {
  console.error('❌ Migration failed:', error);
  process.exit(1);
}
