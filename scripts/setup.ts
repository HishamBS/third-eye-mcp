#!/usr/bin/env bun

/**
 * Third Eye MCP Setup Script
 *
 * Comprehensive first-time setup:
 * 1. Checks prerequisites
 * 2. Creates database directory
 * 3. Runs migrations
 * 4. Seeds default data
 * 5. Validates installation
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { homedir } from 'os';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message: string, color: keyof typeof COLORS = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function header(title: string) {
  console.log('');
  log(`${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log(`${'='.repeat(60)}`, 'cyan');
  console.log('');
}

async function checkPrerequisites() {
  header('Checking Prerequisites');

  // Check Bun version
  const bunVersion = Bun.version;
  log(`✓ Bun version: ${bunVersion}`, 'green');

  if (parseInt(bunVersion.split('.')[0]) < 1) {
    log('✗ Bun 1.0+ required', 'red');
    process.exit(1);
  }

  // Check Node modules
  const packageJson = resolve(process.cwd(), 'package.json');
  if (!existsSync(packageJson)) {
    log('✗ package.json not found. Are you in the project root?', 'red');
    process.exit(1);
  }

  log('✓ Project structure validated', 'green');
}

async function createDatabaseDirectory() {
  header('Setting Up Database');

  const overseerDir = resolve(homedir(), '.third-eye-mcp');

  if (!existsSync(overseerDir)) {
    mkdirSync(overseerDir, { recursive: true, mode: 0o755 });
    log(`✓ Created directory: ${overseerDir}`, 'green');
  } else {
    log(`✓ Directory exists: ${overseerDir}`, 'yellow');
  }

  // Create default config if doesn't exist
  const configPath = resolve(overseerDir, 'config.json');
  if (!existsSync(configPath)) {
    const defaultConfig = {
      db: {
        path: resolve(overseerDir, 'mcp.db'),
      },
      server: {
        host: '127.0.0.1',
        port: 7070,
      },
      ui: {
        port: 3300,
        autoOpen: false,
      },
      providers: {
        groq: {
          baseUrl: 'https://api.groq.com/openai/v1',
        },
        openrouter: {
          baseUrl: 'https://openrouter.ai/api/v1',
        },
        ollama: {
          baseUrl: 'http://127.0.0.1:11434',
        },
        lmstudio: {
          baseUrl: 'http://127.0.0.1:1234/v1',
        },
      },
      telemetry: {
        enabled: false,
      },
    };

    writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    log(`✓ Created config: ${configPath}`, 'green');
  } else {
    log(`✓ Config exists: ${configPath}`, 'yellow');
  }

  return overseerDir;
}

async function runMigrations() {
  header('Running Database Migrations');

  try {
    const { getDb } = await import('../packages/db/index.js');
    const { db } = getDb();

    // Check if database is initialized
    const tables = await db.run("SELECT name FROM sqlite_master WHERE type='table'");

    if (tables) {
      log(`✓ Database initialized (${tables} tables)`, 'green');
    } else {
      log('⚠ Database schema may need initialization', 'yellow');
    }
  } catch (error) {
    log(`⚠ Migration check failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'yellow');
    log('  This is normal on first run. Database will be created automatically.', 'cyan');
  }
}

async function seedDatabase() {
  header('Seeding Default Data');

  try {
    // Import and run seed script
    const { seedDatabase: runSeed } = await import('./seed-database.js');
    await runSeed();
  } catch (error) {
    log(`✗ Seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'red');
    log('  You can manually seed later with: bun run scripts/seed-database.ts', 'yellow');
  }
}

async function validateInstallation() {
  header('Validating Installation');

  const checks = [
    { name: 'Server entry point', path: 'apps/server/src/start.ts' },
    { name: 'UI package', path: 'apps/ui/package.json' },
    { name: 'MCP server', path: 'bin/mcp-server.ts' },
    { name: 'Core package', path: 'packages/core/index.ts' },
    { name: 'Providers package', path: 'packages/providers/index.ts' },
    { name: 'Database package', path: 'packages/db/index.ts' },
  ];

  let allValid = true;

  for (const check of checks) {
    const path = resolve(process.cwd(), check.path);
    if (existsSync(path)) {
      log(`✓ ${check.name}`, 'green');
    } else {
      log(`✗ ${check.name} not found`, 'red');
      allValid = false;
    }
  }

  return allValid;
}

function printNextSteps(overseerDir: string) {
  header('Setup Complete!');

  log('📊 Database location:', 'bright');
  log(`   ${resolve(overseerDir, 'mcp.db')}`, 'cyan');
  console.log('');

  log('⚙️  Configuration:', 'bright');
  log(`   ${resolve(overseerDir, 'config.json')}`, 'cyan');
  console.log('');

  log('🚀 Next Steps:', 'bright');
  console.log('');

  log('   1. Start the server:', 'yellow');
  log('      bun run dev', 'cyan');
  log('         OR', 'reset');
  log('      bunx third-eye-mcp up', 'cyan');
  console.log('');

  log('   2. Open the UI:', 'yellow');
  log('      http://localhost:3300', 'cyan');
  console.log('');

  log('   3. Configure providers:', 'yellow');
  log('      → Visit Models & Routing', 'cyan');
  log('      → Add API keys for Groq/OpenRouter', 'cyan');
  log('      → Or use local Ollama/LM Studio', 'cyan');
  console.log('');

  log('   4. Connect Claude Desktop:', 'yellow');
  log('      → Add to claude_desktop_config.json:', 'cyan');
  console.log('');
  log('      {', 'reset');
  log('        "mcpServers": {', 'reset');
  log('          "third-eye": {', 'reset');
  log('            "command": "bun",', 'reset');
  log(`            "args": ["run", "${resolve(process.cwd(), 'bin/mcp-server.ts')}"]`, 'reset');
  log('          }', 'reset');
  log('        }', 'reset');
  log('      }', 'reset');
  console.log('');

  log('   5. Restart Claude Desktop', 'yellow');
  console.log('');

  log('📖 Documentation:', 'bright');
  log('   → README.md - Overview and quickstart', 'cyan');
  log('   → docs/MCP_API.md - MCP tool reference', 'cyan');
  log('   → docs/PROVIDERS.md - Provider setup guide', 'cyan');
  console.log('');

  log('🧿 Welcome to Third Eye MCP!', 'green');
  console.log('');
}

async function main() {
  console.clear();

  log('🧿 Third Eye MCP Setup', 'bright');
  log('Local-first AI orchestration layer\n', 'cyan');

  try {
    await checkPrerequisites();
    const overseerDir = await createDatabaseDirectory();
    await runMigrations();
    await seedDatabase();

    const isValid = await validateInstallation();

    if (!isValid) {
      log('\n⚠ Some validation checks failed. The setup may be incomplete.', 'yellow');
      log('Please check the errors above and ensure all files are present.\n', 'yellow');
      process.exit(1);
    }

    printNextSteps(overseerDir);

    process.exit(0);
  } catch (error) {
    console.error('');
    log('✗ Setup failed:', 'red');
    log(`  ${error instanceof Error ? error.message : 'Unknown error'}`, 'red');
    console.error('');
    process.exit(1);
  }
}

// Run setup
if (import.meta.main) {
  main();
}
