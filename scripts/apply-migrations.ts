import { Database } from 'bun:sqlite';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { homedir } from 'os';

const defaultDbPath = resolve(homedir(), '.third-eye-mcp/mcp.db');
const dbPath = process.env.MCP_DB || defaultDbPath;
const db = new Database(dbPath);

// Enable WAL
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Execute migration files in order
const migrations = [
  'packages/db/migrations/0001_silent_preak.sql',
  'packages/db/migrations/0002_powerful_mac_gargan.sql',
  'packages/db/migrations/0003_add_mcp_integrations.sql'
];

console.log('🔧 Applying migrations...\n');

for (const migFile of migrations) {
  console.log(`📄 ${migFile}`);
  const sql = readFileSync(migFile, 'utf-8');
  const statements = sql.split('--> statement-breakpoint');

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (trimmed && !trimmed.startsWith('--')) {
      try {
        db.exec(trimmed);
      } catch (err: any) {
        if (!err.message?.includes('already exists')) {
          console.error('❌ Error:', err.message);
        }
      }
    }
  }
}

console.log('\n✅ All migrations executed');

// List all tables
const tables = db.query('SELECT name FROM sqlite_master WHERE type="table" ORDER BY name').all() as { name: string }[];
console.log('\n📋 Tables:', tables.map(t => t.name).join(', '));

db.close();
