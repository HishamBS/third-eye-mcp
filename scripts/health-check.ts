#!/usr/bin/env bun

/**
 * Third Eye MCP Health Check Script
 *
 * Verifies all system components are operational:
 * - Server responding
 * - UI responding
 * - Database exists and accessible
 * - Schema version correct
 * - Provider keys configured
 * - Eye routing seeded
 * - Personas seeded
 * - MCP integrations configured
 *
 * Usage: bun run scripts/health-check.ts
 * Exit code: 0 if all pass, 1 if any fail
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { Database } from 'bun:sqlite';

// Configuration
const MCP_HOST = process.env.MCP_HOST || '127.0.0.1';
const MCP_PORT = process.env.MCP_PORT || 7070;
const UI_PORT = process.env.MCP_UI_PORT || 3300;
const DB_PATH = process.env.MCP_DB || join(process.env.HOME || '~', '.third-eye-mcp', 'mcp.db');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper to print colored text
function print(color: keyof typeof colors, text: string) {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

// Health check result tracker
interface CheckResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: CheckResult[] = [];

function addResult(name: string, passed: boolean, message?: string) {
  results.push({ name, passed, message });
  const symbol = passed ? '✓' : '✗';
  const color = passed ? 'green' : 'red';
  const output = message ? `${symbol} ${name}: ${message}` : `${symbol} ${name}`;
  print(color, output);
}

// Header
print('cyan', '\n🧿 Third Eye MCP Health Check');
print('cyan', '━'.repeat(60));

// Check 1: Server responding
async function checkServer(): Promise<boolean> {
  try {
    const response = await fetch(`http://${MCP_HOST}:${MCP_PORT}/health`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      addResult('Server responding', false, `HTTP ${response.status}`);
      return false;
    }

    const data = await response.json();
    addResult('Server responding', true, `http://${MCP_HOST}:${MCP_PORT}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    addResult('Server responding', false, message);
    return false;
  }
}

// Check 2: UI responding
async function checkUI(): Promise<boolean> {
  try {
    const response = await fetch(`http://${MCP_HOST}:${UI_PORT}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      addResult('UI responding', false, `HTTP ${response.status}`);
      return false;
    }

    addResult('UI responding', true, `http://${MCP_HOST}:${UI_PORT}`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Connection failed';
    addResult('UI responding', false, message);
    return false;
  }
}

// Check 3: Database exists and accessible
function checkDatabase(): { exists: boolean; db?: Database } {
  const exists = existsSync(DB_PATH);

  if (!exists) {
    addResult('Database exists and accessible', false, `Not found at ${DB_PATH}`);
    return { exists: false };
  }

  try {
    const db = new Database(DB_PATH, { readonly: true });
    addResult('Database exists and accessible', true, DB_PATH);
    return { exists: true, db };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot open database';
    addResult('Database exists and accessible', false, message);
    return { exists: false };
  }
}

// Check 4: Schema version
function checkSchemaVersion(db: Database): boolean {
  try {
    const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map((t: any) => t.name);

    const requiredTables = [
      'sessions',
      'pipeline_runs',
      'eyes_routing',
      'personas',
      'provider_keys',
    ];

    const missingTables = requiredTables.filter(t => !tableNames.includes(t));

    if (missingTables.length > 0) {
      addResult('Schema version correct', false, `Missing tables: ${missingTables.join(', ')}`);
      return false;
    }

    addResult('Schema version correct', true, 'All required tables present');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Schema check failed';
    addResult('Schema version correct', false, message);
    return false;
  }
}

// Check 5: Provider keys configured
function checkProviderKeys(db: Database): boolean {
  try {
    const keys = db.query("SELECT provider FROM provider_keys").all() as Array<{ provider: string }>;

    if (keys.length === 0) {
      addResult('Provider keys configured', false, 'No provider keys found');
      return false;
    }

    const providers = keys.map(k => k.provider);
    addResult('Provider keys configured', true, providers.join(', '));
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot query provider keys';
    addResult('Provider keys configured', false, message);
    return false;
  }
}

// Check 6: Eye routing seeded
function checkEyeRouting(db: Database): boolean {
  try {
    const routes = db.query("SELECT COUNT(*) as count FROM eyes_routing").get() as { count: number };

    if (routes.count === 0) {
      addResult('Eye routing seeded', false, 'No routing configurations found');
      return false;
    }

    const expectedEyes = 8;
    if (routes.count < expectedEyes) {
      addResult('Eye routing seeded', false, `Only ${routes.count}/${expectedEyes} eyes configured`);
      return false;
    }

    addResult('Eye routing seeded', true, `${routes.count}/${expectedEyes} eyes`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot query eye routing';
    addResult('Eye routing seeded', false, message);
    return false;
  }
}

// Check 7: Personas seeded
function checkPersonas(db: Database): boolean {
  try {
    const personas = db.query("SELECT COUNT(*) as count FROM personas").get() as { count: number };

    if (personas.count === 0) {
      addResult('Personas seeded', false, 'No personas found');
      return false;
    }

    const expectedPersonas = 8;
    if (personas.count < expectedPersonas) {
      addResult('Personas seeded', false, `Only ${personas.count}/${expectedPersonas} personas`);
      return false;
    }

    addResult('Personas seeded', true, `${personas.count}/${expectedPersonas} personas`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot query personas';
    addResult('Personas seeded', false, message);
    return false;
  }
}

// Check 8: MCP integrations configured
function checkMCPIntegrations(db: Database): boolean {
  try {
    // Check if mcp_integrations table exists
    const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='mcp_integrations'").all();

    if (tables.length === 0) {
      // Table doesn't exist, that's okay for older versions
      addResult('MCP integrations configured', true, 'Optional table (not required)');
      return true;
    }

    const integrations = db.query("SELECT COUNT(*) as count FROM mcp_integrations").get() as { count: number };
    addResult('MCP integrations configured', true, `${integrations.count} integrations`);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cannot query MCP integrations';
    addResult('MCP integrations configured', false, message);
    return false;
  }
}

// Main health check
async function runHealthCheck(): Promise<boolean> {
  let allPassed = true;

  // Run server checks (async)
  const serverOk = await checkServer();
  allPassed = allPassed && serverOk;

  const uiOk = await checkUI();
  allPassed = allPassed && uiOk;

  // Run database checks
  const { exists, db } = checkDatabase();

  if (!exists || !db) {
    allPassed = false;
    print('cyan', '━'.repeat(60));
    print('red', '✗ HEALTH CHECK FAILED');
    print('yellow', '\nDatabase not found. Run: bunx third-eye-mcp up');
    return false;
  }

  const schemaOk = checkSchemaVersion(db);
  allPassed = allPassed && schemaOk;

  if (!schemaOk) {
    db.close();
    print('cyan', '━'.repeat(60));
    print('red', '✗ HEALTH CHECK FAILED');
    print('yellow', '\nDatabase schema outdated. Run: bun run db:migrate');
    return false;
  }

  const keysOk = checkProviderKeys(db);
  allPassed = allPassed && keysOk;

  const routingOk = checkEyeRouting(db);
  allPassed = allPassed && routingOk;

  const personasOk = checkPersonas(db);
  allPassed = allPassed && personasOk;

  const integrationsOk = checkMCPIntegrations(db);
  allPassed = allPassed && integrationsOk;

  db.close();

  return allPassed;
}

// Run the health check
const allPassed = await runHealthCheck();

// Summary
print('cyan', '━'.repeat(60));

if (allPassed) {
  print('green', '✓ ALL SYSTEMS OPERATIONAL');
  print('cyan', '\nNext steps:');
  print('reset', '  • Dashboard: http://127.0.0.1:3300');
  print('reset', '  • Connect AI client (see docs/integrations/)');
  print('reset', '  • Send test request via MCP tool');
} else {
  print('red', '✗ HEALTH CHECK FAILED');
  print('cyan', '\nFailed checks:');
  results
    .filter(r => !r.passed)
    .forEach(r => {
      print('yellow', `  • ${r.name}${r.message ? ': ' + r.message : ''}`);
    });

  print('cyan', '\nTroubleshooting:');
  print('reset', '  • Start services: bunx third-eye-mcp up');
  print('reset', '  • View logs: bunx third-eye-mcp logs');
  print('reset', '  • Check status: bunx third-eye-mcp status');
  print('reset', '  • Reset database: bunx third-eye-mcp reset (WARNING: deletes data)');
}

print('reset', '');

// Exit with appropriate code
process.exit(allPassed ? 0 : 1);
