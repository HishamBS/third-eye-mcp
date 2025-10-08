#!/usr/bin/env bun

/**
 * Database Restore Script
 *
 * Restores the SQLite database from a timestamped backup
 */

import { existsSync, readdirSync, copyFileSync, statSync } from 'fs';
import { resolve, dirname } from 'path';
import { homedir } from 'os';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof COLORS = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

const DEFAULT_DB_PATH = resolve(homedir(), '.third-eye-mcp/mcp.db');

async function restoreDatabase() {
  const DB_PATH = process.env.MCP_DB || DEFAULT_DB_PATH;
  const BACKUPS_DIR = resolve(dirname(DB_PATH), 'backups');

  // Check if backups directory exists
  if (!existsSync(BACKUPS_DIR)) {
    log(`✗ Backups directory not found: ${BACKUPS_DIR}`, 'red');
    log('  Run backup first: bun run scripts/backup-db.ts', 'yellow');
    process.exit(1);
  }

  // List available backups
  const backups = readdirSync(BACKUPS_DIR)
    .filter(f => f.startsWith('third-eye-mcp-backup-') && f.endsWith('.db'))
    .sort()
    .reverse();

  if (backups.length === 0) {
    log(`✗ No backups found in: ${BACKUPS_DIR}`, 'red');
    log('  Create a backup first: bun run scripts/backup-db.ts', 'yellow');
    process.exit(1);
  }

  // Display available backups
  log('\n📦 Available backups:', 'cyan');
  backups.forEach((backup, index) => {
    const path = resolve(BACKUPS_DIR, backup);
    const stats = statSync(path);
    const size = (stats.size / 1024).toFixed(2);
    const date = stats.mtime.toLocaleString();
    log(`  ${index + 1}. ${backup}`, 'magenta');
    log(`     Size: ${size} KB | Modified: ${date}`, 'reset');
  });

  // Get backup selection from command line argument
  const selectedIndex = process.argv[2] ? parseInt(process.argv[2]) - 1 : 0;

  if (selectedIndex < 0 || selectedIndex >= backups.length) {
    log(`\n✗ Invalid backup selection: ${selectedIndex + 1}`, 'red');
    log(`  Please select a number between 1 and ${backups.length}`, 'yellow');
    log(`\n  Usage: bun run scripts/restore-db.ts [backup_number]`, 'cyan');
    log(`  Example: bun run scripts/restore-db.ts 1`, 'cyan');
    process.exit(1);
  }

  const selectedBackup = backups[selectedIndex];
  const backupPath = resolve(BACKUPS_DIR, selectedBackup);

  // Show current database info if it exists
  if (existsSync(DB_PATH)) {
    const currentStats = statSync(DB_PATH);
    const currentSize = (currentStats.size / 1024).toFixed(2);
    const currentDate = currentStats.mtime.toLocaleString();

    log(`\n⚠️  WARNING: This will replace your current database!`, 'yellow');
    log(`  Current: ${DB_PATH}`, 'reset');
    log(`  Size: ${currentSize} KB | Modified: ${currentDate}`, 'reset');
    log(`\n  Restoring from: ${selectedBackup}`, 'cyan');

    // Create a backup of current database before restoring
    const preRestoreBackup = `third-eye-mcp-pre-restore-${new Date().toISOString().replace(/[:.]/g, '-').split('T')[0]}_${new Date().toTimeString().split(' ')[0].replace(/:/g, '-')}.db`;
    const preRestoreBackupPath = resolve(BACKUPS_DIR, preRestoreBackup);

    try {
      copyFileSync(DB_PATH, preRestoreBackupPath);
      log(`✓ Created pre-restore backup: ${preRestoreBackup}`, 'green');
    } catch (error) {
      log(`✗ Failed to create pre-restore backup: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red');
      log('  Restore cancelled for safety', 'yellow');
      process.exit(1);
    }
  } else {
    log(`\n💡 No existing database found at: ${DB_PATH}`, 'cyan');
    log(`  Restoring from: ${selectedBackup}`, 'cyan');
  }

  try {
    // Restore the database
    log('\n🔄 Restoring database...', 'cyan');
    copyFileSync(backupPath, DB_PATH);

    const restoredStats = statSync(DB_PATH);
    const restoredSize = (restoredStats.size / 1024).toFixed(2);

    log(`✓ Database restored successfully!`, 'green');
    log(`  Backup:   ${backupPath}`, 'reset');
    log(`  Restored: ${DB_PATH}`, 'reset');
    log(`  Size:     ${restoredSize} KB`, 'reset');

    log('\n💡 To verify the restoration, run: bun run setup', 'yellow');
    log('💡 To create a new backup, run: bun run scripts/backup-db.ts', 'yellow');

  } catch (error) {
    log(`✗ Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red');
    process.exit(1);
  }
}

if (import.meta.main) {
  restoreDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { restoreDatabase };
