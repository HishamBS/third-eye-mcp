#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .name('third-eye-mcp')
  .description('🧿 Third Eye MCP - AI Agent Validation Server')
  .version('1.0.0');

// UP command - Start everything
program
  .command('up')
  .description('Start Third Eye MCP server and UI')
  .option('-p, --port <port>', 'Server port', '7070')
  .option('-u, --ui-port <port>', 'UI port', '3300')
  .option('--no-open', 'Do not open browser automatically')
  .action(async (options) => {
    console.log(chalk.cyan('🧿 Starting Third Eye MCP...\\n'));

    const spinner = ora('Starting server...').start();

    try {
      // Find project root
      const projectRoot = join(__dirname, '../..');

      // Check if we're in development or production
      const isDev = existsSync(join(projectRoot, 'apps/server'));

      if (!isDev) {
        spinner.fail('Server not found. Make sure you\'re in the project directory.');
        process.exit(1);
      }

      // Start server
      const server = spawn('pnpm', ['--filter', '@third-eye/server', 'dev'], {
        cwd: projectRoot,
        stdio: 'pipe',
        shell: true,
        env: {
          ...process.env,
          PORT: options.port,
        },
      });

      server.stdout?.on('data', (data) => {
        const message = data.toString().trim();
        if (message.includes('Server running')) {
          spinner.succeed(`Server running on http://localhost:${options.port}`);
        }
      });

      // Start UI
      const uiSpinner = ora('Starting UI...').start();

      const ui = spawn('pnpm', ['--filter', '@third-eye/ui', 'dev'], {
        cwd: projectRoot,
        stdio: 'pipe',
        shell: true,
        env: {
          ...process.env,
          PORT: options.uiPort,
        },
      });

      ui.stdout?.on('data', (data) => {
        const message = data.toString().trim();
        if (message.includes('ready') || message.includes('Local:')) {
          uiSpinner.succeed(`UI running on http://localhost:${options.uiPort}`);

          // Open browser
          if (options.open) {
            setTimeout(() => {
              open(`http://localhost:${options.uiPort}`);
              console.log(chalk.green('\\n✨ Third Eye MCP is ready!'));
              console.log(chalk.gray('  Press Ctrl+C to stop\\n'));
            }, 1000);
          }
        }
      });

      // Handle errors
      server.stderr?.on('data', (data) => {
        console.error(chalk.red(data.toString()));
      });

      ui.stderr?.on('data', (data) => {
        console.error(chalk.red(data.toString()));
      });

      // Handle exit
      const cleanup = () => {
        console.log(chalk.yellow('\\n\\nShutting down...'));
        server.kill();
        ui.kill();
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);

    } catch (error) {
      spinner.fail('Failed to start Third Eye MCP');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// DB commands
const db = program.command('db').description('Database utilities');

db.command('open')
  .description('Open SQLite database in browser')
  .action(async () => {
    console.log(chalk.cyan('🧿 Opening database...\\n'));

    try {
      const dbPath = join(process.cwd(), 'third-eye.db');

      if (!existsSync(dbPath)) {
        console.log(chalk.yellow('Database not found. Run migrations first.'));
        process.exit(1);
      }

      // Open with sqlite-web or similar
      console.log(chalk.green(`Database location: ${dbPath}`));
      console.log(chalk.gray('\\nYou can open it with:\\n'));
      console.log(chalk.white('  sqlite3 third-eye.db'));
      console.log(chalk.white('  # or'));
      console.log(chalk.white('  npx sqlite-viewer third-eye.db'));

    } catch (error) {
      console.error(chalk.red('Failed to open database'));
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

db.command('reset')
  .description('Reset database (delete all data)')
  .option('-y, --yes', 'Skip confirmation')
  .action(async (options) => {
    if (!options.yes) {
      console.log(chalk.yellow('⚠️  This will delete ALL data in the database.'));
      console.log(chalk.gray('Run with --yes to confirm\\n'));
      process.exit(1);
    }

    const spinner = ora('Resetting database...').start();

    try {
      const { getDb } = await import('@third-eye/db');
      const { sessions, runs, personas, eyesRouting, providerKeys } = await import('@third-eye/db');
      const { sql } = await import('drizzle-orm');

      const { db } = getDb();

      // Delete all data
      await db.delete(runs);
      await db.delete(sessions);
      await db.delete(personas);
      await db.delete(eyesRouting);
      await db.delete(providerKeys);

      spinner.succeed('Database reset complete');
      console.log(chalk.green('\\n✨ All data deleted. You can now run migrations.\\n'));

    } catch (error) {
      spinner.fail('Failed to reset database');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

db.command('migrate')
  .description('Run database migrations')
  .action(async () => {
    const spinner = ora('Running migrations...').start();

    try {
      const { migrate } = await import('@third-eye/db');

      await migrate();

      spinner.succeed('Migrations complete');
      console.log(chalk.green('\\n✨ Database is up to date\\n'));

    } catch (error) {
      spinner.fail('Migration failed');
      console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check Third Eye MCP status')
  .action(async () => {
    console.log(chalk.cyan('🧿 Third Eye MCP Status\\n'));

    const checks = [
      { name: 'Database', check: async () => {
        const dbPath = join(process.cwd(), 'third-eye.db');
        return existsSync(dbPath);
      }},
      { name: 'Server', check: async () => {
        try {
          const response = await fetch('http://localhost:7070/health');
          return response.ok;
        } catch {
          return false;
        }
      }},
      { name: 'UI', check: async () => {
        try {
          const response = await fetch('http://localhost:3300');
          return response.ok;
        } catch {
          return false;
        }
      }},
    ];

    for (const { name, check } of checks) {
      const spinner = ora(name).start();
      const status = await check();

      if (status) {
        spinner.succeed(chalk.green(name));
      } else {
        spinner.fail(chalk.red(name));
      }
    }

    console.log('');
  });

program.parse();
