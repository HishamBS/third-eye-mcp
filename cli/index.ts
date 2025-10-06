#!/usr/bin/env bun

/**
 * Third Eye MCP CLI
 *
 * NPX entrypoint for local-first AI orchestration
 */

import { spawn } from 'child_process';
import { resolve } from 'path';
import { existsSync } from 'fs';

const COMMANDS = {
  up: 'Start server and UI concurrently',
  'db open': 'Open UI DB browser route',
  reset: 'Wipe ~/.overseer after confirmation',
  'docker up': 'Run docker compose (optional)',
} as const;

type Command = keyof typeof COMMANDS;

function showHelp() {
  console.log(`
🧿 Third Eye MCP - Local-first AI orchestration

Usage:
  npx third-eye-mcp <command>

Commands:
  up              ${COMMANDS.up}
  db open         ${COMMANDS['db open']}
  reset           ${COMMANDS.reset}
  docker up       ${COMMANDS['docker up']}

Examples:
  npx third-eye-mcp up
  npx third-eye-mcp db open
  npx third-eye-mcp reset

For more information, visit: https://github.com/third-eye-mcp
`);
}

function getProjectRoot(): string {
  // Find the project root by looking for package.json with third-eye-mcp name
  let current = process.cwd();
  const root = resolve('/');

  while (current !== root) {
    const packagePath = resolve(current, 'package.json');
    if (existsSync(packagePath)) {
      try {
        const pkg = require(packagePath);
        if (pkg.name === 'third-eye-mcp') {
          return current;
        }
      } catch {}
    }
    current = resolve(current, '..');
  }

  // Fallback to current directory
  return process.cwd();
}

async function startServices() {
  const projectRoot = getProjectRoot();

  console.log('🧿 Third Eye MCP - Starting services...');
  console.log(`📁 Project root: ${projectRoot}`);

  // Start server in background
  console.log('🚀 Starting server...');
  const server = spawn('bun', ['run', 'apps/server/src/start.ts'], {
    cwd: projectRoot,
    stdio: ['inherit', 'pipe', 'pipe'],
    detached: false,
  });

  server.stdout?.on('data', (data) => {
    console.log(`[SERVER] ${data.toString().trim()}`);
  });

  server.stderr?.on('data', (data) => {
    console.error(`[SERVER] ${data.toString().trim()}`);
  });

  // Wait a moment for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Start UI
  console.log('🎨 Starting UI...');
  const ui = spawn('bun', ['run', '--cwd', 'apps/ui', 'dev'], {
    cwd: projectRoot,
    stdio: ['inherit', 'pipe', 'pipe'],
    detached: false,
  });

  ui.stdout?.on('data', (data) => {
    console.log(`[UI] ${data.toString().trim()}`);
  });

  ui.stderr?.on('data', (data) => {
    console.error(`[UI] ${data.toString().trim()}`);
  });

  // Print URLs
  console.log('');
  console.log('✅ Services started successfully!');
  console.log('');
  console.log('🌐 URLs:');
  console.log('  UI:     http://127.0.0.1:3300');
  console.log('  Server: http://127.0.0.1:7070');
  console.log('  Health: http://127.0.0.1:7070/health');
  console.log('');
  console.log('Press Ctrl+C to stop services');

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('\n📴 Shutting down services...');
    server.kill('SIGTERM');
    ui.kill('SIGTERM');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  await Promise.all([
    new Promise(resolve => server.on('exit', resolve)),
    new Promise(resolve => ui.on('exit', resolve)),
  ]);
}

async function openDbBrowser() {
  const url = 'http://127.0.0.1:3300/db';
  console.log(`🗄️  Opening DB browser: ${url}`);

  // Open URL in default browser
  const { spawn } = require('child_process');
  const command = process.platform === 'darwin' ? 'open' :
                 process.platform === 'win32' ? 'start' : 'xdg-open';

  spawn(command, [url], { detached: true, stdio: 'ignore' });
}

async function resetData() {
  const { confirm } = await import('@inquirer/prompts');

  const confirmed = await confirm({
    message: 'This will permanently delete all data in ~/.overseer. Continue?',
    default: false,
  });

  if (!confirmed) {
    console.log('Reset cancelled.');
    return;
  }

  const { homedir } = require('os');
  const { rmSync } = require('fs');
  const overseerDir = resolve(homedir(), '.overseer');

  try {
    rmSync(overseerDir, { recursive: true, force: true });
    console.log('✅ Data reset successfully.');
    console.log('💡 Run "npx third-eye-mcp up" to reinitialize.');
  } catch (error) {
    console.error('❌ Failed to reset data:', error);
    process.exit(1);
  }
}

async function dockerUp() {
  const projectRoot = getProjectRoot();
  const dockerComposePath = resolve(projectRoot, 'docker/docker-compose.yml');

  if (!existsSync(dockerComposePath)) {
    console.error('❌ Docker compose file not found at docker/docker-compose.yml');
    process.exit(1);
  }

  console.log('🐳 Starting Docker services...');

  const docker = spawn('docker', ['compose', '-f', dockerComposePath, 'up'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  docker.on('exit', (code) => {
    process.exit(code || 0);
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  const command = args.join(' ') as Command;

  try {
    switch (command) {
      case 'up':
        await startServices();
        break;

      case 'db open':
        await openDbBrowser();
        break;

      case 'reset':
        await resetData();
        break;

      case 'docker up':
        await dockerUp();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    process.exit(1);
  }
}

// Run CLI
if (import.meta.main) {
  main().catch(console.error);
}