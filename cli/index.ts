#!/usr/bin/env bun

import { spawn, exec, execSync } from 'child_process';
import { resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, appendFileSync } from 'fs';
import { homedir } from 'os';
import { select, input, confirm } from '@inquirer/prompts';
import ora, { Ora } from 'ora';
import kleur from 'kleur';

const VERSION = process.env.npm_package_version || JSON.parse(
  readFileSync(resolve(import.meta.dir, '../package.json'), 'utf-8')
).version;
const SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT) : 7070;
const UI_PORT = process.env.UI_PORT ? parseInt(process.env.UI_PORT) : 3300;

const THIRD_EYE_DIR = resolve(homedir(), '.third-eye-mcp');
const PIDS_DIR = resolve(THIRD_EYE_DIR, 'pids');
const LOGS_DIR = resolve(THIRD_EYE_DIR, 'logs');
const SERVER_PID_FILE = resolve(PIDS_DIR, 'server.pid');
const UI_PID_FILE = resolve(PIDS_DIR, 'ui.pid');
const SERVER_LOG_FILE = resolve(LOGS_DIR, 'server.log');
const UI_LOG_FILE = resolve(LOGS_DIR, 'ui.log');
const RELEASE_HISTORY_FILE = resolve(THIRD_EYE_DIR, 'release-history.json');

interface CliArgs {
  command: string;
  foreground?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  noUi?: boolean;
  port?: number;
  uiPort?: number;
  tail?: boolean;
}

function showHelp() {
  console.log(`
${kleur.bold().magenta(`🧿 Third Eye MCP v${VERSION}`)}
${kleur.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
${kleur.white('Local-first AI orchestration layer for multi-provider LLM workflows')}

${kleur.cyan('USAGE:')}
  bunx third-eye-mcp <command> [options]
  third-eye-mcp <command> [options]   ${kleur.gray('(after global install)')}

${kleur.cyan('COMMANDS:')}
  up              Start services (detached by default)
  stop            Stop all services gracefully
  restart         Restart all services
  status          Show service status
  logs            View logs (use --tail to follow)
  server          Start MCP server only (stdio mode for agents)
  db open         Open database browser
  reset           Wipe all data (requires confirmation)
  release         Interactive release assistant
  release:ship    Run full release pipeline (version → tests → publish)

${kleur.cyan('OPTIONS:')}
  --foreground    Run in foreground with live output
  --verbose       Show detailed output
  --quiet         Minimal output
  --no-ui         Start server only, skip UI
  --port <n>      Server port (default: 7070)
  --ui-port <n>   UI port (default: 3300)
  --tail          Tail logs in real-time

${kleur.cyan('EXAMPLES:')}
  bunx third-eye-mcp up
  bunx third-eye-mcp up --foreground --verbose
  bunx third-eye-mcp up --no-ui --port 8080
  bunx third-eye-mcp status
  bunx third-eye-mcp logs --tail
  bunx third-eye-mcp stop
  bunx third-eye-mcp restart
  bunx third-eye-mcp release:ship

For documentation: ${kleur.underline('https://github.com/third-eye-mcp')}
`);
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = { command: args[0] || 'help' };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--foreground':
      case '-f':
        parsed.foreground = true;
        break;
      case '--verbose':
      case '-v':
        parsed.verbose = true;
        break;
      case '--quiet':
      case '-q':
        parsed.quiet = true;
        break;
      case '--no-ui':
        parsed.noUi = true;
        break;
      case '--port':
        parsed.port = parseInt(args[++i]);
        break;
      case '--ui-port':
        parsed.uiPort = parseInt(args[++i]);
        break;
      case '--tail':
      case '-t':
        parsed.tail = true;
        break;
    }
  }

  return parsed;
}

function ensureDirectories() {
  [THIRD_EYE_DIR, PIDS_DIR, LOGS_DIR].forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
}

async function prepareDatabase(verbose: boolean) {
  const start = Date.now();

  try {
    const [{ getDb, personas, mcpIntegrations }, { count }, { seedDatabase }, { seedIntegrations }] = await Promise.all([
      import('@third-eye/db'),
      import('drizzle-orm'),
      import('../scripts/seed-database.ts'),
      import('../scripts/seed-integrations.ts')
    ]);

    const { db, dbPath } = getDb();

    const personaCounts = await db
      .select({ value: count() })
      .from(personas)
      .limit(1);

    const personaCount = personaCounts[0]?.value ?? 0;
    let seeded = false;

    if (personaCount === 0) {
      await seedDatabase();
      seeded = true;
    }

    // Always check and seed integrations
    const integrationCounts = await db
      .select({ value: count() })
      .from(mcpIntegrations)
      .limit(1);

    const integrationCount = integrationCounts[0]?.value ?? 0;
    let integrationsSeeded = false;

    if (integrationCount === 0) {
      await seedIntegrations();
      integrationsSeeded = true;
    }

    if (verbose) {
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      console.log('\n🗄  Database ready');
      console.log(`   Path: ${dbPath}`);
      console.log(`   Personas: ${seeded ? 'seeded' : personaCount}`);
      console.log(`   Integrations: ${integrationsSeeded ? 'seeded (9 tools)' : integrationCount}`);
      console.log(`   Prep time: ${duration}s\n`);
    }
  } catch (error) {
    console.error('❌ Failed to prepare database:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function log(message: string, verbose: boolean = false) {
  if (!verbose || parseArgs().verbose) {
    console.log(message);
  }
}

function checkEnvironment() {
  if (!parseArgs().quiet) {
    log('🔍 Pre-flight checks...');
  }

  const bunVersion = process.versions.bun;
  if (bunVersion) {
    log(`   ✓ Bun ${bunVersion}`, true);
  } else {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 18) {
      console.error(`   ✗ Node.js 18+ required (found ${nodeVersion})`);
      process.exit(1);
    }
    log(`   ✓ Node.js ${nodeVersion}`, true);
  }

  ensureDirectories();
  log('   ✓ Database directory ready', true);

  const portsToCheck = [SERVER_PORT];
  if (!parseArgs().noUi) portsToCheck.push(UI_PORT);

  for (const port of portsToCheck) {
    try {
      execSync(`lsof -ti:${port}`, { stdio: 'ignore' });
      log(`   ⚠ Port ${port} in use`, true);
    } catch {
      log(`   ✓ Port ${port} available`, true);
    }
  }

  try {
    const stats = execSync('df -h . | tail -1').toString();
    const available = stats.split(/\s+/)[3];
    log(`   ✓ Disk space: ${available} free`, true);
  } catch {}
}

async function killPortProcesses(ports: number[]) {
  if (!parseArgs().quiet) {
    log('🔄 Cleaning up stale processes...');
  }

  let killed = 0;
  for (const port of ports) {
    try {
      const pids = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' })
        .trim()
        .split('\n')
        .filter(Boolean);

      for (const pid of pids) {
        try {
          process.kill(parseInt(pid), 'SIGTERM');
          log(`   ✓ Freed port ${port} (killed PID ${pid})`);
          killed++;
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch {}
      }
    } catch {}
  }

  if (killed === 0 && !parseArgs().quiet) {
    log('   ✓ No stale processes found');
  }
}

function getPid(file: string): number | null {
  try {
    const pid = parseInt(readFileSync(file, 'utf-8').trim());
    try {
      process.kill(pid, 0);
      return pid;
    } catch {
      rmSync(file);
      return null;
    }
  } catch {
    return null;
  }
}

function savePid(file: string, pid: number) {
  writeFileSync(file, pid.toString());
}

function appendLog(file: string, data: string) {
  const timestamp = new Date().toISOString();
  appendFileSync(file, `[${timestamp}] ${data}`);
}

async function waitForHealth(url: string, maxAttempts: number = 15): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) return true;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

function getProjectRoot(): string {
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
  return process.cwd();
}

function readPackageVersion(projectRoot: string): string {
  const pkgPath = resolve(projectRoot, 'package.json');
  return JSON.parse(readFileSync(pkgPath, 'utf-8')).version;
}

function getGitStatus(projectRoot: string): string {
  try {
    return execSync('git status --porcelain', { cwd: projectRoot }).toString().trim();
  } catch {
    return '';
  }
}

function runStep(command: string, projectRoot: string, label?: string) {
  const header = label ? `${label}: ${command}` : command;
  console.log(`\n${kleur.cyan('▶')} ${header}`);
  execSync(command, { cwd: projectRoot, stdio: 'inherit' });
}

function stageReleaseFiles(projectRoot: string) {
  try {
    runStep('git add -u', projectRoot, 'git');
  } catch (error) {
    console.warn('⚠️  Failed to stage tracked changes with git add -u');
    throw error;
  }

  const changelogPath = resolve(projectRoot, 'CHANGELOG.md');
  if (existsSync(changelogPath)) {
    try {
      runStep('git add CHANGELOG.md', projectRoot, 'git');
    } catch (error) {
      console.warn('⚠️  Unable to stage CHANGELOG.md');
      throw error;
    }
  }
}

async function runReleasePipeline() {
  const projectRoot = getProjectRoot();
  const initialStatus = getGitStatus(projectRoot);

  if (initialStatus.length > 0) {
    console.error('❌ Working tree must be clean before running the automated release pipeline.');
    console.error('   Please commit or stash changes, then retry.');
    process.exit(1);
  }

  const previousVersion = readPackageVersion(projectRoot);
  await runReleaseAssistant();

  const targetVersion = readPackageVersion(projectRoot);
  if (targetVersion === previousVersion) {
    console.log('\nℹ️  Version unchanged. Release pipeline aborted.');
    return;
  }

  console.log(`\n🎯 Target version: v${targetVersion}`);

  console.log('\n🛡️  Running release gate (pnpm release:prepare --dry-run)…');
  try {
    runStep('pnpm release:prepare --dry-run', projectRoot, 'pnpm');
  } catch (error) {
    console.error('\n❌ Release gate failed. Fix the reported issues and rerun the pipeline.');
    throw error;
  }

  const commitConfirmed = await confirm({
    message: 'Stage release files and create the release commit?',
    default: true,
  });

  if (!commitConfirmed) {
    console.log('Release pipeline cancelled before commit.');
    return;
  }

  stageReleaseFiles(projectRoot);

  const staged = execSync('git diff --cached --name-only', { cwd: projectRoot }).toString().trim();
  let commitCreated = false;
  if (!staged) {
    console.warn('⚠️  No changes staged. Ensure version bump and changelog updates completed.');
  } else {
    runStep(`git commit -m "chore(release): v${targetVersion}"`, projectRoot, 'git');
    commitCreated = true;
  }

  const remainingStatus = getGitStatus(projectRoot);
  if (remainingStatus.length > 0) {
    console.error('\n❌ Uncommitted changes detected. Resolve them before publishing.');
    process.exit(1);
  }

  if (!commitCreated) {
    console.log('\nℹ️  No release commit created; skipping automated publish.');
    return;
  }

  const publishConfirmed = await confirm({
    message: 'Publish to npm now?',
    default: true,
  });

  if (!publishConfirmed) {
    console.log('Release pipeline cancelled before npm publish.');
    return;
  }

  runStep('pnpm release:publish', projectRoot, 'pnpm');

  const tagConfirmed = await confirm({
    message: `Create git tag v${targetVersion}?`,
    default: true,
  });

  if (tagConfirmed) {
    runStep(`git tag -a v${targetVersion} -m "Third Eye MCP v${targetVersion}"`, projectRoot, 'git');
  }

  const pushConfirmed = await confirm({
    message: 'Push branch and tags to origin?',
    default: true,
  });

  if (pushConfirmed) {
    runStep('git push origin HEAD', projectRoot, 'git');
    if (tagConfirmed) {
      runStep(`git push origin v${targetVersion}`, projectRoot, 'git');
    }
  }

  console.log('\n🎉 Release pipeline completed successfully.');
}

async function startServices() {
  const args = parseArgs();
  const projectRoot = getProjectRoot();
  const startTime = Date.now();

  if (!args.quiet) {
    console.log(`\n${kleur.bold().magenta(`🧿 Third Eye MCP v${VERSION}`)}`);
    console.log(kleur.gray('━'.repeat(60)));
  }

  checkEnvironment();
  await prepareDatabase(!args.quiet);
  await killPortProcesses([args.port || SERVER_PORT, args.uiPort || UI_PORT]);

  if (!args.quiet) {
    log(`\n${kleur.green('🚀 Starting services')}${args.foreground ? kleur.gray(' (foreground)') : kleur.gray(' (detached)')}...`);
  }

  const serverStartTime = Date.now();
  const serverProcess = spawn('bun', ['run', 'apps/server/src/start.ts'], {
    cwd: projectRoot,
    stdio: args.foreground ? 'inherit' : 'ignore',
    detached: !args.foreground,
    env: { ...process.env, PORT: String(args.port || SERVER_PORT) },
  });

  if (!args.foreground) {
    savePid(SERVER_PID_FILE, serverProcess.pid!);
    serverProcess.unref();
  }

  let serverSpinner: Ora | null = null;
  if (!args.quiet) {
    serverSpinner = ora({ text: `Server starting on port ${args.port || SERVER_PORT}...`, spinner: 'dots' }).start();
  }
  const serverHealthy = await waitForHealth(`http://127.0.0.1:${args.port || SERVER_PORT}/health`, 30);
  const serverTime = ((Date.now() - serverStartTime) / 1000).toFixed(1);

  if (serverSpinner) {
    if (serverHealthy) {
      serverSpinner.succeed(kleur.green(`Server healthy (${serverTime}s)`));
    } else {
      serverSpinner.warn(kleur.yellow('Server may still be starting (check status); health endpoint not ready.'));
    }
  } else {
    log(serverHealthy ? `   ✓ Server healthy (${serverTime}s)` : `   ⚠ Server may still be starting (check status in a moment)`);
  }

  if (!args.noUi) {
    const uiStartTime = Date.now();
    const uiProcess = spawn('bun', ['run', '--cwd', 'apps/ui', 'dev', '--port', String(args.uiPort || UI_PORT)], {
      cwd: projectRoot,
      stdio: args.foreground ? 'inherit' : 'ignore',
      detached: !args.foreground,
    });

    if (!args.foreground) {
      savePid(UI_PID_FILE, uiProcess.pid!);
      uiProcess.unref();
    }

    let uiSpinner: Ora | null = null;
    if (!args.quiet) {
      uiSpinner = ora({ text: `UI starting on port ${args.uiPort || UI_PORT}...`, spinner: 'dots' }).start();
    }
    const uiHealthy = await waitForHealth(`http://127.0.0.1:${args.uiPort || UI_PORT}`);
    const uiTime = ((Date.now() - uiStartTime) / 1000).toFixed(1);

    if (uiSpinner) {
      if (uiHealthy) {
        uiSpinner.succeed(kleur.green(`UI ready (${uiTime}s)`));
      } else {
        uiSpinner.warn(kleur.yellow('UI may still be starting; visit the URL to confirm.'));
      }
    } else {
      log(uiHealthy ? `   ✓ UI ready (${uiTime}s)` : `   ⚠ UI may still be starting`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  if (!args.quiet) {
    console.log(`\n${kleur.bold(kleur.green(`✨ Started in ${totalTime}s`))}\n`);
    console.log(kleur.bold().magenta('🧿 Third-Eye MCP — READY'));
    console.log(kleur.gray('━'.repeat(60)));
    console.log(`• Server: ${kleur.cyan(`http://127.0.0.1:${args.port || SERVER_PORT}`)} ${kleur.green('✓')}`);
    if (!args.noUi) {
      console.log(`• UI:     ${kleur.cyan(`http://127.0.0.1:${args.uiPort || UI_PORT}`)} ${kleur.green('✓')}`);
    }
    console.log(`• DB:     ${kleur.cyan('~/.third-eye-mcp/mcp.db')}`);
    console.log(`• Logs:   ${kleur.cyan('~/.third-eye-mcp/logs/')}`);
    if (!args.foreground) {
      const serverPid = getPid(SERVER_PID_FILE);
      const uiPid = !args.noUi ? getPid(UI_PID_FILE) : null;
      console.log(`• PIDs:   server(${serverPid})${uiPid ? ` ui(${uiPid})` : ''}`);
    }
    console.log(`\n${kleur.cyan('📖 Next steps:')}`);
    console.log(`   ${kleur.yellow('bunx third-eye-mcp status')}  - Check status`);
    console.log(`   ${kleur.yellow('bunx third-eye-mcp logs')}    - View logs`);
    console.log(`   ${kleur.yellow('bunx third-eye-mcp stop')}    - Stop services`);

    if (args.foreground) {
      console.log(kleur.gray('\nRunning in foreground. Press Ctrl+C to stop.'));
    } else {
      console.log(kleur.gray('\nRunning in background. Safe to close terminal.'));
    }
  }

  if (args.foreground) {
    const shutdown = () => {
      console.log('\n📴 Shutting down services...');
      if (serverProcess.pid) process.kill(serverProcess.pid, 'SIGTERM');
      if (!args.noUi && uiProcess && uiProcess.pid) process.kill(uiProcess.pid, 'SIGTERM');
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    await new Promise(() => {});
  }
}

async function stopServices() {
  console.log('📴 Stopping services...\n');

  const serverPid = getPid(SERVER_PID_FILE);
  const uiPid = getPid(UI_PID_FILE);

  let stopped = 0;

  if (serverPid) {
    try {
      process.kill(serverPid, 'SIGTERM');
      console.log(`   ✓ Server stopped (PID ${serverPid})`);
      rmSync(SERVER_PID_FILE);
      stopped++;
    } catch (err) {
      console.log(`   ⚠ Server not running`);
    }
  }

  if (uiPid) {
    try {
      process.kill(uiPid, 'SIGTERM');
      console.log(`   ✓ UI stopped (PID ${uiPid})`);
      rmSync(UI_PID_FILE);
      stopped++;
    } catch (err) {
      console.log(`   ⚠ UI not running`);
    }
  }

  if (stopped === 0) {
    console.log('   ℹ No services were running');
  } else {
    console.log(`\n✅ Stopped ${stopped} service${stopped > 1 ? 's' : ''}`);
  }
}

async function showStatus() {
  console.log('🧿 Third Eye MCP - Status');
  console.log('━'.repeat(60));

  const serverPid = getPid(SERVER_PID_FILE);
  const uiPid = getPid(UI_PID_FILE);

  if (serverPid) {
    try {
      const stats = execSync(`ps -o etime,rss -p ${serverPid}`).toString().split('\n')[1].trim().split(/\s+/);
      const uptime = stats[0];
      const memory = Math.round(parseInt(stats[1]) / 1024);
      console.log(`Server:  ✓ Running (PID ${serverPid}, uptime ${uptime})`);
      console.log(`         Memory: ${memory}MB`);

      const healthCheck = await waitForHealth(`http://127.0.0.1:${SERVER_PORT}/health`, 1);
      if (healthCheck) {
        console.log(`         Health: ✓ Responding`);
      }
    } catch {
      console.log(`Server:  ✗ Process not found`);
    }
  } else {
    console.log('Server:  ○ Not running');
  }

  if (uiPid) {
    try {
      const stats = execSync(`ps -o etime,rss -p ${uiPid}`).toString().split('\n')[1].trim().split(/\s+/);
      const uptime = stats[0];
      const memory = Math.round(parseInt(stats[1]) / 1024);
      console.log(`UI:      ✓ Running (PID ${uiPid}, uptime ${uptime})`);
      console.log(`         Memory: ${memory}MB`);
    } catch {
      console.log(`UI:      ✗ Process not found`);
    }
  } else {
    console.log('UI:      ○ Not running');
  }

  console.log('━'.repeat(60));
}

async function showLogs() {
  const args = parseArgs();

  if (args.tail) {
    console.log('📜 Tailing logs (Ctrl+C to stop)...\n');
    const tail = spawn('tail', ['-f', SERVER_LOG_FILE, UI_LOG_FILE], {
      stdio: 'inherit',
    });
    await new Promise(() => {});
  } else {
    console.log('📜 Recent logs:\n');
    console.log('━ SERVER ━'.repeat(10));
    try {
      const serverLogs = execSync(`tail -20 ${SERVER_LOG_FILE}`).toString();
      console.log(serverLogs);
    } catch {
      console.log('No server logs available');
    }

    console.log('\n━ UI ━'.repeat(10));
    try {
      const uiLogs = execSync(`tail -20 ${UI_LOG_FILE}`).toString();
      console.log(uiLogs);
    } catch {
      console.log('No UI logs available');
    }

    console.log('\n💡 Use --tail to follow logs in real-time');
  }
}

async function restartServices() {
  await stopServices();
  await new Promise(resolve => setTimeout(resolve, 1000));
  await startServices();
}

async function startMCPServer() {
  const projectRoot = getProjectRoot();
  console.log('🧿 Starting Third Eye MCP Server (stdio mode)...\n');

  const server = spawn('bun', ['run', 'bin/mcp-server.ts'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  server.on('exit', (code) => {
    process.exit(code || 0);
  });

  await new Promise(() => {});
}

async function openDbBrowser() {
  console.log('🗄️  Opening DB browser...');
  const url = `http://127.0.0.1:${UI_PORT}/db`;

  const command = process.platform === 'darwin' ? 'open' :
                 process.platform === 'win32' ? 'start' : 'xdg-open';

  spawn(command, [url], { detached: true, stdio: 'ignore' });
}

function bumpVersion(current: string, type: 'patch' | 'minor' | 'major'): string {
  const parts = current.split('.').map(num => parseInt(num, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Invalid semantic version: ${current}`);
  }

  let [major, minor, patch] = parts;
  switch (type) {
    case 'patch':
      patch += 1;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
  }

  return `${major}.${minor}.${patch}`;
}

async function runReleaseAssistant() {
  const projectRoot = getProjectRoot();
  console.log('\n🚀 Third Eye MCP Release Assistant');
  console.log('━'.repeat(60));
  console.log(`Current version: v${VERSION}`);

  const gitStatus = execSync('git status --porcelain', { cwd: projectRoot }).toString().trim();
  if (gitStatus.length > 0) {
    const proceed = await confirm({
      message: 'Working tree is dirty. Continue anyway?',
      default: false,
    });
    if (!proceed) {
      console.log('Release aborted. Clean your working tree and retry.');
      return;
    }
  }

  const bumpChoice = await select<{ value: string } | string>({
    message: 'Select version bump',
    choices: [
      { name: `Patch (${bumpVersion(VERSION, 'patch')})`, value: 'patch' },
      { name: `Minor (${bumpVersion(VERSION, 'minor')})`, value: 'minor' },
      { name: `Major (${bumpVersion(VERSION, 'major')})`, value: 'major' },
      { name: 'Custom…', value: 'custom' },
      { name: 'Abort', value: 'abort' },
    ],
  });

  if (bumpChoice === 'abort') {
    console.log('Release aborted.');
    return;
  }

  let targetVersion: string;
  if (bumpChoice === 'custom') {
    targetVersion = await input({
      message: 'Enter the new version (semver)',
      default: VERSION,
      validate: (value) => /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/.test(value) || 'Invalid semantic version',
    });
  } else {
    targetVersion = bumpVersion(VERSION, bumpChoice as 'patch' | 'minor' | 'major');
  }

  const confirmed = await confirm({
    message: `Apply version v${targetVersion}?`,
    default: true,
  });

  if (!confirmed) {
    console.log('Release aborted.');
    return;
  }

  console.log('\n📝 Updating package version...');
  execSync(`npm version ${targetVersion} --no-git-tag-version`, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  const changelogPath = resolve(projectRoot, 'CHANGELOG.md');
  const addNotes = await confirm({
    message: 'Add release notes to CHANGELOG.md?',
    default: true,
  });

  if (addNotes) {
    const notes = await input({
      message: 'Release summary (Markdown)',
      default: '- TBD',
    });

    const existing = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf-8') : '# Changelog\n\n';
    const date = new Date().toISOString().split('T')[0];
    const entry = `## v${targetVersion} - ${date}\n\n${notes}\n\n`;
    writeFileSync(changelogPath, `${existing.startsWith('# Changelog') ? existing : `# Changelog\n\n${existing}`}`
      .replace('# Changelog', `# Changelog\n\n${entry}`));
  }

  console.log('\n✅ Version updated.');
  try {
    const entry = {
      version: targetVersion,
      date: new Date().toISOString(),
      changelog: addNotes ? 'updated' : 'skipped',
    };

    let history: Array<typeof entry> = [];
    if (existsSync(RELEASE_HISTORY_FILE)) {
      history = JSON.parse(readFileSync(RELEASE_HISTORY_FILE, 'utf-8'));
    }
    history.unshift(entry);
    writeFileSync(RELEASE_HISTORY_FILE, JSON.stringify(history.slice(0, 20), null, 2));
    console.log(`🗂  Release history updated (${RELEASE_HISTORY_FILE})`);
  } catch (error) {
    console.warn('⚠️  Failed to persist release history:', error instanceof Error ? error.message : error);
  }

  console.log('\nNext steps:');
  console.log('  1. Review git diff and stage files.');
  console.log('  2. Run `pnpm release:prepare:dry` to verify artifacts.');
  console.log('  3. Commit & tag release.');
  console.log('  4. Publish with `pnpm release:publish`.');
}

async function resetData() {
  const confirmed = await confirm({
    message: 'This will permanently delete all data in ~/.third-eye-mcp. Continue?',
    default: false,
  });

  if (!confirmed) {
    console.log('Reset cancelled.');
    return;
  }

  try {
    rmSync(THIRD_EYE_DIR, { recursive: true, force: true });
    console.log('✅ Data reset successfully.');
    console.log('💡 Run "bunx third-eye-mcp up" to reinitialize.');
  } catch (error) {
    console.error('❌ Failed to reset data:', error);
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs();

  if (args.command === '--help' || args.command === '-h' || args.command === 'help') {
    showHelp();
    return;
  }

  try {
    switch (args.command) {
      case 'up':
        await startServices();
        break;

      case 'stop':
        await stopServices();
        break;

      case 'restart':
        await restartServices();
        break;

      case 'status':
        await showStatus();
        break;

      case 'logs':
        await showLogs();
        break;

      case 'server':
        await startMCPServer();
        break;

      case 'db':
        if (process.argv[3] === 'open') {
          await openDbBrowser();
        } else {
          console.error('❌ Unknown db command. Try: bunx third-eye-mcp db open');
          process.exit(1);
        }
        break;

      case 'reset':
        await resetData();
        break;

      case 'release':
        await runReleaseAssistant();
        break;

      case 'release:ship':
        await runReleasePipeline();
        break;

      default:
        console.error(`❌ Unknown command: ${args.command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Command failed:', error);
    console.error('\n💡 For help, run: bunx third-eye-mcp --help');
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
