#!/usr/bin/env bun

/**
 * Database Backup Script
 *
 * Creates timestamped backups of the SQLite database
 */

import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { homedir } from 'os';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof COLORS = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

const DEFAULT_DB_PATH = resolve(homedir(), '.third-eye-mcp/mcp.db');

async function backupDatabase() {
  const DB_PATH = process.env.MCP_DB || DEFAULT_DB_PATH;

  // Check if database exists
  if (!existsSync(DB_PATH)) {
    log(`✗ Database not found at: ${DB_PATH}`, 'red');
    log('  Run setup first: bun run setup', 'yellow');
    process.exit(1);
  }

  // Create backups directory
  const BACKUPS_DIR = resolve(dirname(DB_PATH), 'backups');
  if (!existsSync(BACKUPS_DIR)) {
    mkdirSync(BACKUPS_DIR, { recursive: true });
    log(`✓ Created backups directory: ${BACKUPS_DIR}`, 'green');
  }

  // Create timestamped backup filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                    new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const backupFilename = `third-eye-mcp-backup-${timestamp}.db`;
  const backupPath = resolve(BACKUPS_DIR, backupFilename);

  try {
    // Copy database file
    log('\n🔄 Creating database backup...', 'cyan');
    copyFileSync(DB_PATH, backupPath);

    const { statSync } = await import('fs');
    const stats = statSync(backupPath);
    const sizeKB = (stats.size / 1024).toFixed(2);

    log(`✓ Backup created successfully!`, 'green');
    log(`  Source: ${DB_PATH}`, 'reset');
    log(`  Backup: ${backupPath}`, 'reset');
    log(`  Size:   ${sizeKB} KB`, 'reset');

    // List recent backups
    const { readdirSync } = await import('fs');
    const backups = readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith('third-eye-mcp-backup-') && f.endsWith('.db'))
      .sort()
      .reverse()
      .slice(0, 5);

    if (backups.length > 0) {
      log('\n📦 Recent backups:', 'cyan');
      backups.forEach((backup, index) => {
        const path = resolve(BACKUPS_DIR, backup);
        const stats = statSync(path);
        const size = (stats.size / 1024).toFixed(2);
        const date = stats.mtime.toLocaleString();
        log(`  ${index + 1}. ${backup} (${size} KB) - ${date}`, 'reset');
      });
    }

    log('\n💡 To restore a backup, run: bun run scripts/restore-db.ts', 'yellow');

  } catch (error) {
    log(`✗ Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red');
    process.exit(1);
  }
}

if (import.meta.main) {
  backupDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { backupDatabase };
