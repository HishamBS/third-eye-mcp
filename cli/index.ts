#!/usr/bin/env bun

import { spawn, exec, execSync, ChildProcess } from "child_process";
import { resolve } from "path";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  appendFileSync,
  readdirSync,
  statSync,
  renameSync,
} from "fs";
import { homedir } from "os";
import { select, input, confirm } from "@inquirer/prompts";
import ora, { Ora } from "ora";
import kleur from "kleur";
import { CLI_BIN, CLI_EXEC, TOOL_NAME, DATA_DIRECTORY } from "@third-eye/types";

const VERSION =
  process.env.npm_package_version ||
  JSON.parse(readFileSync(resolve(import.meta.dir, "../package.json"), "utf-8"))
    .version;
const SERVER_PORT = process.env.PORT ? parseInt(process.env.PORT) : 7070;
const UI_PORT = process.env.UI_PORT ? parseInt(process.env.UI_PORT) : 3300;

const THIRD_EYE_DIR = resolve(homedir(), DATA_DIRECTORY);
const PIDS_DIR = resolve(THIRD_EYE_DIR, "pids");
const LOGS_DIR = resolve(THIRD_EYE_DIR, "logs");
const SERVER_PID_FILE = resolve(PIDS_DIR, "server.pid");
const UI_PID_FILE = resolve(PIDS_DIR, "ui.pid");
const SERVER_LOG_FILE = resolve(LOGS_DIR, "server.log");
const UI_LOG_FILE = resolve(LOGS_DIR, "ui.log");
const BUILD_LOG_FILE = resolve(LOGS_DIR, "build.log");
const RELEASE_HISTORY_FILE = resolve(THIRD_EYE_DIR, "release-history.json");

// Cleanup patterns for stale source artifacts (R13: SSOT for cleanup logic)
const CLEANUP_PATTERNS = {
  SOURCE_JS: ["**/*.js", "!*.config.js"],
  SOURCE_MAPS: ["**/*.js.map", "**/*.d.ts.map"],
  TYPE_DEFS: ["**/*.d.ts"],
  BUILD_INFO: ["*.tsbuildinfo"],
} as const;

const CLEANUP_DIRS = [
  "packages/*/src",
  "apps/ui/src",
  "apps/server/src",
] as const;

interface CliArgs {
  command: string;
  foreground?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  noUi?: boolean;
  port?: number;
  uiPort?: number;
  tail?: boolean;
  skipUpdate?: boolean;
  nuclear?: boolean;
  quick?: boolean;
}

function showHelp() {
  console.log(`
${kleur.bold().magenta(`🧿 Third Eye MCP v${VERSION}`)}
${kleur.gray("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")}
${kleur.white("Local-first AI orchestration layer for multi-provider LLM workflows")}

${kleur.cyan("USAGE:")}
  ${CLI_EXEC} <command> [options]
  ${CLI_BIN} <command> [options]   ${kleur.gray("(after global install)")}

${kleur.cyan("COMMANDS:")}
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

${kleur.cyan("OPTIONS:")}
  --foreground    Run in foreground with live output
  --verbose       Show detailed output
  --quiet         Minimal output
  --no-ui         Start server only, skip UI
  --port <n>      Server port (default: 7070)
  --ui-port <n>   UI port (default: 3300)
  --tail          Tail logs in real-time
  --skip-update   Skip dependency updates (faster iterations)
  --quick         Skip updates and stale checks (just start)
  --nuclear       Full clean (remove node_modules, reinstall)

${kleur.cyan("EXAMPLES:")}
  ${CLI_EXEC} up
  ${CLI_EXEC} up --foreground --verbose
  ${CLI_EXEC} up --no-ui --port 8080
  ${CLI_EXEC} up --quick
  ${CLI_EXEC} up --nuclear
  ${CLI_EXEC} status
  ${CLI_EXEC} logs --tail
  ${CLI_EXEC} stop
  ${CLI_EXEC} restart
  ${CLI_EXEC} release:ship

For documentation: ${kleur.underline("https://github.com/third-eye-mcp")}
`);
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const parsed: CliArgs = { command: args[0] || "help" };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--foreground":
      case "-f":
        parsed.foreground = true;
        break;
      case "--verbose":
      case "-v":
        parsed.verbose = true;
        break;
      case "--quiet":
      case "-q":
        parsed.quiet = true;
        break;
      case "--no-ui":
        parsed.noUi = true;
        break;
      case "--port":
        parsed.port = parseInt(args[++i]);
        break;
      case "--ui-port":
        parsed.uiPort = parseInt(args[++i]);
        break;
      case "--tail":
      case "-t":
        parsed.tail = true;
        break;
      case "--skip-update":
        parsed.skipUpdate = true;
        break;
      case "--nuclear":
        parsed.nuclear = true;
        break;
      case "--quick":
        parsed.quick = true;
        break;
    }
  }

  return parsed;
}

function commandExists(command: string): boolean {
  try {
    execSync(
      process.platform === "win32"
        ? `where ${command}`
        : `command -v ${command}`,
      { stdio: "ignore" },
    );
    return true;
  } catch {
    return false;
  }
}

function ensureDirectories() {
  [THIRD_EYE_DIR, PIDS_DIR, LOGS_DIR].forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
}

function hasNodeModules(path: string): boolean {
  try {
    return existsSync(path) && readdirSync(path).length > 0;
  } catch {
    return false;
  }
}

function runInstallCommand(
  command: string,
  args: string[],
  cwd: string,
  label: string,
  verbose: boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (verbose) {
      console.log(`📦 ${label}`);
    } else {
      console.log(`   • ${label}`);
    }

    const child = spawn(command, args, {
      cwd,
      stdio: verbose ? "inherit" : "pipe",
    });

    let output = "";
    if (!verbose) {
      child.stdout?.on("data", (chunk) => {
        output += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        output += chunk.toString();
      });
    }

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        if (!verbose) {
          console.log("      ✓ done");
        }
        resolve();
      } else {
        if (!verbose && output.trim().length > 0) {
          console.error(output.trim());
        }
        const nodeModulesPath = resolve(cwd, "node_modules");
        if (hasNodeModules(nodeModulesPath)) {
          console.warn(
            `⚠️  ${command} ${args.join(" ")} exited with code ${code}, but dependencies appear to be installed.`,
          );
          resolve();
        } else {
          reject(
            new Error(`${command} ${args.join(" ")} exited with code ${code}`),
          );
        }
      }
    });
  });
}

async function ensureDependencies(verbose: boolean) {
  const projectRoot = getProjectRoot();
  const rootNodeModules = resolve(projectRoot, "node_modules");
  const uiNodeModules = resolve(projectRoot, "apps/ui/node_modules");

  const needsRootInstall = !hasNodeModules(rootNodeModules);
  if (needsRootInstall) {
    await installWithFallback(projectRoot, "root dependencies", verbose);
  } else if (verbose) {
    console.log("📦 Root dependencies already installed");
  }

  const needsUiInstall = !hasNodeModules(uiNodeModules);
  if (needsUiInstall) {
    await installWithFallback(
      resolve(projectRoot, "apps/ui"),
      "UI dependencies",
      verbose,
    );
  } else if (verbose) {
    console.log("📦 UI dependencies already installed");
  }
}

async function installWithFallback(
  cwd: string,
  label: string,
  verbose: boolean,
) {
  const strategies: Array<{ cmd: string; args: string[]; display: string }> =
    [];

  if (commandExists("bun"))
    strategies.push({ cmd: "bun", args: ["install"], display: "bun install" });
  if (commandExists("npm"))
    strategies.push({ cmd: "npm", args: ["install"], display: "npm install" });

  if (strategies.length === 0) {
    throw new Error(
      "No package manager found (bun/npm). Install bun for the best experience.",
    );
  }

  const labelPrefix = `Installing ${label}`;
  let lastError: Error | null = null;

  for (const strategy of strategies) {
    try {
      await runInstallCommand(
        strategy.cmd,
        strategy.args,
        cwd,
        `${labelPrefix} (${strategy.display})...`,
        verbose,
      );
      // Verify install succeeded by checking node_modules
      const nodeModulesPath = resolve(cwd, "node_modules");
      if (hasNodeModules(nodeModulesPath)) {
        return;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (verbose) {
        console.warn(`⚠️  ${strategy.display} failed: ${lastError.message}`);
      }
    }
  }

  throw lastError ?? new Error(`Failed to install dependencies for ${label}`);
}

async function prepareDatabase(verbose: boolean) {
  const start = Date.now();

  try {
    const [
      { getDb, getDbPath, personas, mcpIntegrations, schema },
      { count },
      { seedDefaults },
    ] = await Promise.all([
      import("@third-eye/db"),
      import("drizzle-orm"),
      import("@third-eye/db/defaults"),
    ]);

    // Clean up stale WAL files before database initialization
    // This prevents disk I/O errors when database was manually deleted but WAL files remain
    const dbPath = getDbPath();
    const walFile = `${dbPath}-wal`;
    const shmFile = `${dbPath}-shm`;

    // Close any existing database connection first to release file locks
    try {
      const { closeDb } = await import("@third-eye/db");
      closeDb();
    } catch (err) {
      // Ignore if closeDb doesn't exist or fails
    }

    // Clean up WAL/SHM files if database doesn't exist OR if they're stale
    // These files can lock the directory even when the DB file is missing
    // Also check for stale WAL files when DB exists (they may be corrupted)
    const dbExists = existsSync(dbPath);
    const walExists = existsSync(walFile);
    const shmExists = existsSync(shmFile);

    if (!dbExists) {
      // Database doesn't exist - clean up orphaned WAL files
      if (walExists) {
        try {
          rmSync(walFile, { force: true });
          if (verbose) {
            console.log(`   🧹 Cleaned orphaned WAL file`);
          }
        } catch (err) {
          if (verbose) {
            console.log(
              `   ⚠️  Could not remove WAL file (may be locked): ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }

      if (shmExists) {
        try {
          rmSync(shmFile, { force: true });
          if (verbose) {
            console.log(`   🧹 Cleaned orphaned SHM file`);
          }
        } catch (err) {
          if (verbose) {
            console.log(
              `   ⚠️  Could not remove SHM file (may be locked): ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }
    } else if (walExists || shmExists) {
      // Database exists - check if WAL files are stale (older than DB or empty)
      // Empty WAL files (0 bytes) are often corrupted
      try {
        const dbStats = statSync(dbPath);
        let shouldClean = false;

        if (walExists) {
          const walStats = statSync(walFile);
          // Clean if WAL is empty (0 bytes) or older than DB (indicates stale state)
          if (walStats.size === 0 || walStats.mtimeMs < dbStats.mtimeMs) {
            shouldClean = true;
          }
        }

        if (shmExists) {
          const shmStats = statSync(shmFile);
          // Clean if SHM is older than DB (indicates stale state)
          if (shmStats.mtimeMs < dbStats.mtimeMs) {
            shouldClean = true;
          }
        }

        if (shouldClean) {
          // Actively remove stale/corrupted WAL files before database access
          // This prevents disk I/O errors during PRAGMA journal_mode = WAL
          if (walExists) {
            try {
              rmSync(walFile, { force: true });
              if (verbose) {
                console.log(`   🧹 Removed stale/corrupted WAL file`);
              }
            } catch (err) {
              if (verbose) {
                console.warn(
                  `   ⚠️  Could not remove WAL file: ${err instanceof Error ? err.message : String(err)}`,
                );
              }
            }
          }

          if (shmExists) {
            try {
              rmSync(shmFile, { force: true });
              if (verbose) {
                console.log(`   🧹 Removed stale SHM file`);
              }
            } catch (err) {
              if (verbose) {
                console.warn(
                  `   ⚠️  Could not remove SHM file: ${err instanceof Error ? err.message : String(err)}`,
                );
              }
            }
          }
        }
      } catch (err) {
        // Ignore stat errors - will rely on retry logic in createDb()
      }
    }

    const { db } = getDb();
    const scopedLog = verbose
      ? (message: string) => console.log(`   ${message}`)
      : () => {};
    const report = await seedDefaults({ log: scopedLog });

    const personaCounts = await db
      .select({ value: count() })
      .from(personas)
      .limit(1);
    const personaCount = personaCounts[0]?.value ?? 0;

    const integrationCounts = await db
      .select({ value: count() })
      .from(mcpIntegrations)
      .limit(1);
    const integrationCount = integrationCounts[0]?.value ?? 0;

    if (verbose) {
      const duration = ((Date.now() - start) / 1000).toFixed(1);
      console.log("\n🗄  Database ready");
      console.log(`   Path: ${dbPath}`);
      console.log(
        `   Personas: ${report.personas ? "seeded defaults" : personaCount}`,
      );
      console.log(
        `   Blueprints: ${report.blueprints ? "seeded" : "already exists"}`,
      );
      console.log(
        `   Integrations: ${report.integrations ? "seeded defaults" : integrationCount}`,
      );
      console.log(`   Prep time: ${duration}s\n`);
    }
  } catch (error) {
    console.error(
      "❌ Failed to prepare database:",
      error instanceof Error ? error.message : error,
    );
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
    log("🔍 Pre-flight checks...");
  }

  // Check Bun/Node version
  const bunVersion = process.versions.bun;
  if (bunVersion) {
    log(`   ✓ Bun ${bunVersion}`, true);
  } else {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);
    if (majorVersion < 18) {
      console.error(`   ✗ Node.js 18+ required (found ${nodeVersion})`);
      process.exit(1);
    }
    log(`   ✓ Node.js ${nodeVersion}`, true);
  }

  // Check Git (required for bun install with git dependencies)
  try {
    execSync("git --version", { stdio: "pipe" });
    log("   ✓ Git installed", true);
  } catch {
    console.error("❌ Git not installed");
    console.error("   Git is required for package installation.");
    console.error("   Install from: https://git-scm.com/downloads");
    process.exit(1);
  }

  // Validate lock file (detect corruption or merge conflicts)
  const projectRoot = getProjectRoot();
  const lockPath = resolve(projectRoot, "bun.lock");
  if (existsSync(lockPath)) {
    try {
      const lockContent = readFileSync(lockPath, "utf-8");

      // Check for git merge conflict markers
      if (
        lockContent.includes("<<<<<<< ") ||
        lockContent.includes(">>>>>>> ") ||
        lockContent.includes("======= ")
      ) {
        console.error("❌ bun.lock has merge conflicts");
        console.error("   Fix: rm bun.lock && bun install");
        process.exit(1);
      }

      // Try to parse as binary/text (bun.lock is binary but we check for obvious corruption)
      // If it's suspiciously small or has NULL bytes in wrong places, it's likely corrupted
      if (lockContent.length < 10) {
        throw new Error("Lock file too small");
      }

      log("   ✓ Lock file valid", true);
    } catch (error) {
      console.error(
        `❌ bun.lock corrupted: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.error("   Fixing: rm bun.lock && bun install");

      // Auto-fix by removing and reinstalling
      try {
        rmSync(lockPath);
        console.log("   Removed corrupted lock file, reinstalling...");
        execSync("bun install", { cwd: projectRoot, stdio: "inherit" });
        log("   ✓ Lock file recreated", true);
      } catch (fixError) {
        console.error(`   ✗ Auto-fix failed: ${fixError}`);
        process.exit(1);
      }
    }
  }

  // Check available memory (warn if < 2GB free)
  try {
    const os = require("os");
    const freeMemGB = os.freemem() / 1024 ** 3;
    if (freeMemGB < 2) {
      console.warn(
        `⚠️  Low memory: ${freeMemGB.toFixed(1)}GB free (recommend 2GB+)`,
      );
    } else {
      log(`   ✓ Memory: ${freeMemGB.toFixed(1)}GB free`, true);
    }
  } catch {
    // Memory check is non-critical
  }

  ensureDirectories();
  log("   ✓ Database directory ready", true);

  // Check ports availability (cross-platform)
  const portsToCheck = [SERVER_PORT];
  if (!parseArgs().noUi) portsToCheck.push(UI_PORT);

  for (const port of portsToCheck) {
    try {
      if (process.platform === "win32") {
        // Windows: use netstat
        execSync(`netstat -ano | findstr :${port}`, { stdio: "ignore" });
        log(`   ⚠ Port ${port} in use`, true);
      } else {
        // Unix: use lsof
        execSync(`lsof -ti:${port}`, { stdio: "ignore" });
        log(`   ⚠ Port ${port} in use`, true);
      }
    } catch {
      log(`   ✓ Port ${port} available`, true);
    }
  }

  // Check disk space (Unix only, non-critical)
  if (process.platform !== "win32") {
    try {
      const stats = execSync("df -h . | tail -1").toString();
      const available = stats.split(/\s+/)[3];
      log(`   ✓ Disk space: ${available} free`, true);
    } catch {}
  }
}

async function killProcessesByPattern(
  pattern: string,
  description: string,
): Promise<number> {
  let killed = 0;

  if (process.platform === "win32") {
    // Windows: use tasklist and taskkill
    try {
      const output = execSync("tasklist /FO CSV /NH", { encoding: "utf-8" });
      const lines = output.trim().split("\n");

      for (const line of lines) {
        // CSV format: "ImageName","PID","SessionName","Session#","MemUsage"
        const match = line.match(/"([^"]+)","(\d+)"/);
        if (match) {
          const [, imageName, pidStr] = match;
          const pid = parseInt(pidStr);

          // Check if process name matches pattern
          if (
            imageName.toLowerCase().includes(pattern.toLowerCase()) &&
            !isNaN(pid) &&
            pid > 0
          ) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
              log(`   ✓ Killed ${description} (PID ${pid})`);
              killed++;
              await new Promise((resolve) => setTimeout(resolve, 300));
            } catch (err) {
              // Process might have already exited
            }
          }
        }
      }
    } catch {
      // No matching processes found
    }
  } else {
    // Unix: use ps and grep
    try {
      const psOutput = execSync(
        `ps aux | grep -E "${pattern}" | grep -v grep`,
        { encoding: "utf-8" },
      )
        .trim()
        .split("\n")
        .filter(Boolean);

      for (const line of psOutput) {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[1]);

        if (!isNaN(pid) && pid > 0) {
          try {
            process.kill(pid, "SIGTERM");
            log(`   ✓ Killed ${description} (PID ${pid})`);
            killed++;
            await new Promise((resolve) => setTimeout(resolve, 300));
          } catch (err) {
            // Process might have already exited
          }
        }
      }
    } catch {
      // No matching processes found or grep returned no results
    }
  }

  return killed;
}

async function cleanStaleProcesses(ports: number[]) {
  if (!parseArgs().quiet) {
    log("🔄 Cleaning up stale processes...");
  }

  let killed = 0;

  // Kill by port (catches active processes) - cross-platform
  for (const port of ports) {
    try {
      let pids: string[] = [];

      if (process.platform === "win32") {
        // Windows: use netstat to find PIDs using the port
        const output = execSync(`netstat -ano | findstr :${port}`, {
          encoding: "utf-8",
        });
        const lines = output.trim().split("\n");

        for (const line of lines) {
          // Extract PID from last column
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && !isNaN(parseInt(pid))) {
            pids.push(pid);
          }
        }

        // Kill each PID with taskkill
        for (const pid of pids) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
            log(`   ✓ Freed port ${port} (killed PID ${pid})`);
            killed++;
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch {}
        }
      } else {
        // Unix: use lsof
        pids = execSync(`lsof -ti:${port}`, { encoding: "utf-8" })
          .trim()
          .split("\n")
          .filter(Boolean);

        for (const pid of pids) {
          try {
            process.kill(parseInt(pid), "SIGTERM");
            log(`   ✓ Freed port ${port} (killed PID ${pid})`);
            killed++;
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch {}
        }
      }
    } catch {}
  }

  // Kill zombie processes by pattern (catches detached/crashed processes)
  // Windows pattern matching is different (process name only, not full command)
  if (process.platform === "win32") {
    killed += await killProcessesByPattern(
      "node.exe",
      "zombie Node.js process",
    );
    killed += await killProcessesByPattern("bun.exe", "zombie Bun process");
  } else {
    killed += await killProcessesByPattern(
      "next-server",
      "zombie Next.js server",
    );
    killed += await killProcessesByPattern(
      "node.*next dev.*3300",
      "zombie Next.js dev process",
    );
    killed += await killProcessesByPattern(
      "bun run --cwd apps/ui dev",
      "zombie Bun UI process",
    );
  }

  if (killed === 0 && !parseArgs().quiet) {
    log("   ✓ No stale processes found");
  }
}

function getPid(file: string): number | null {
  try {
    const pid = parseInt(readFileSync(file, "utf-8").trim());
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

async function waitForHealth(
  url: string,
  serviceName: string,
  maxAttempts: number = 30,
): Promise<boolean> {
  let lastError: string = "";
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        console.log(kleur.dim(`  ${serviceName} health check passed`));
        return true;
      }
      lastError = `HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (i % 5 === 0 && i > 0) {
        console.log(
          kleur.dim(`  Waiting for ${serviceName}... (${lastError})`),
        );
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  console.error(
    kleur.red(`✗ ${serviceName} health check failed: ${lastError}`),
  );
  return false;
}

function getProjectRoot(): string {
  let current = process.cwd();
  const root = resolve("/");

  while (current !== root) {
    const packagePath = resolve(current, "package.json");
    if (existsSync(packagePath)) {
      try {
        const pkg = require(packagePath);
        if (pkg.name === "third-eye-mcp") {
          return current;
        }
      } catch {}
    }
    current = resolve(current, "..");
  }
  return process.cwd();
}

function readPackageVersion(projectRoot: string): string {
  const pkgPath = resolve(projectRoot, "package.json");
  return JSON.parse(readFileSync(pkgPath, "utf-8")).version;
}

function getGitStatus(projectRoot: string): string {
  try {
    return execSync("git status --porcelain", { cwd: projectRoot })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

function runStep(command: string, projectRoot: string, label?: string) {
  const header = label ? `${label}: ${command}` : command;
  console.log(`\n${kleur.cyan("▶")} ${header}`);
  execSync(command, { cwd: projectRoot, stdio: "inherit" });
}

function stageReleaseFiles(projectRoot: string) {
  try {
    runStep("git add -u", projectRoot, "git");
  } catch (error) {
    console.warn("⚠️  Failed to stage tracked changes with git add -u");
    throw error;
  }

  const changelogPath = resolve(projectRoot, "CHANGELOG.md");
  if (existsSync(changelogPath)) {
    try {
      runStep("git add CHANGELOG.md", projectRoot, "git");
    } catch (error) {
      console.warn("⚠️  Unable to stage CHANGELOG.md");
      throw error;
    }
  }
}

async function runReleasePipeline() {
  const projectRoot = getProjectRoot();
  const initialStatus = getGitStatus(projectRoot);

  if (initialStatus.length > 0) {
    console.error(
      "❌ Working tree must be clean before running the automated release pipeline.",
    );
    console.error("   Please commit or stash changes, then retry.");
    process.exit(1);
  }

  const previousVersion = readPackageVersion(projectRoot);
  await runReleaseAssistant();

  const targetVersion = readPackageVersion(projectRoot);
  if (targetVersion === previousVersion) {
    console.log("\nℹ️  Version unchanged. Release pipeline aborted.");
    return;
  }

  console.log(`\n🎯 Target version: v${targetVersion}`);

  console.log("\n🛡️  Running release gate (bun run release:prepare:dry)…");
  try {
    runStep("bun run release:prepare:dry", projectRoot, "bun");
  } catch (error) {
    console.error(
      "\n❌ Release gate failed. Fix the reported issues and rerun the pipeline.",
    );
    throw error;
  }

  const commitConfirmed = await confirm({
    message: "Stage release files and create the release commit?",
    default: true,
  });

  if (!commitConfirmed) {
    console.log("Release pipeline cancelled before commit.");
    return;
  }

  stageReleaseFiles(projectRoot);

  const staged = execSync("git diff --cached --name-only", { cwd: projectRoot })
    .toString()
    .trim();
  let commitCreated = false;
  if (!staged) {
    console.warn(
      "⚠️  No changes staged. Ensure version bump and changelog updates completed.",
    );
  } else {
    runStep(
      `git commit -m "chore(release): v${targetVersion}"`,
      projectRoot,
      "git",
    );
    commitCreated = true;
  }

  const remainingStatus = getGitStatus(projectRoot);
  if (remainingStatus.length > 0) {
    console.error(
      "\n❌ Uncommitted changes detected. Resolve them before publishing.",
    );
    process.exit(1);
  }

  if (!commitCreated) {
    console.log("\nℹ️  No release commit created; skipping automated publish.");
    return;
  }

  const publishConfirmed = await confirm({
    message: "Publish to npm now?",
    default: true,
  });

  if (!publishConfirmed) {
    console.log("Release pipeline cancelled before npm publish.");
    return;
  }

  runStep("bun run release:publish", projectRoot, "bun");

  const tagConfirmed = await confirm({
    message: `Create git tag v${targetVersion}?`,
    default: true,
  });

  if (tagConfirmed) {
    runStep(
      `git tag -a v${targetVersion} -m "Third Eye MCP v${targetVersion}"`,
      projectRoot,
      "git",
    );
  }

  const pushConfirmed = await confirm({
    message: "Push branch and tags to origin?",
    default: true,
  });

  if (pushConfirmed) {
    runStep("git push origin HEAD", projectRoot, "git");
    if (tagConfirmed) {
      runStep(`git push origin v${targetVersion}`, projectRoot, "git");
    }
  }

  console.log("\n🎉 Release pipeline completed successfully.");
}

/**
 * Clean stale compiled artifacts from source directories
 * Per R13: Prevents .js/.d.ts pollution in src/
 */
function cleanSourceArtifacts(projectRoot: string, quiet: boolean): number {
  const spinner = quiet
    ? null
    : ora("Cleaning stale source artifacts...").start();
  let filesRemoved = 0;

  try {
    // Build find command to locate stale compiled files
    const patterns = [
      '-name "*.js" ! -name "*.config.js"',
      '-o -name "*.d.ts"',
      '-o -name "*.js.map"',
      '-o -name "*.d.ts.map"',
      '-o -name "*.tsbuildinfo"',
    ].join(" ");

    for (const dir of CLEANUP_DIRS) {
      const fullPath = resolve(projectRoot, dir);

      // Use find to locate files (handles glob patterns)
      const findCmd = `find ${fullPath} \\( ${patterns} \\) 2>/dev/null || true`;

      try {
        const output = execSync(findCmd, { encoding: "utf-8" });
        const files = output
          .trim()
          .split("\n")
          .filter((f) => f.length > 0);

        for (const file of files) {
          try {
            rmSync(file, { force: true });
            filesRemoved++;
          } catch (err) {
            // Silently skip files that can't be removed
          }
        }
      } catch (err) {
        // Directory might not exist, skip
      }
    }

    if (spinner) {
      if (filesRemoved > 0) {
        spinner.succeed(`Cleaned ${filesRemoved} stale source artifacts`);
      } else {
        spinner.succeed("No stale source artifacts found");
      }
    }

    return filesRemoved;
  } catch (error) {
    if (spinner) {
      spinner.fail("Failed to clean source artifacts");
    }
    if (!quiet) {
      console.error(kleur.yellow(`Warning: ${error}`));
    }
    return filesRemoved;
  }
}

/**
 * Update project dependencies with retry logic
 * Per R12: Keep dependencies fresh
 * Implements exponential backoff for network failures
 */
async function updateDependencies(
  projectRoot: string,
  skipUpdate: boolean,
  quiet: boolean,
): Promise<void> {
  if (skipUpdate) {
    if (!quiet) {
      console.log(
        kleur.gray("⏭️  Skipping dependency updates (--skip-update)"),
      );
    }
    return;
  }

  const spinner = quiet ? null : ora("Updating dependencies...").start();
  const maxAttempts = 3;
  const timeout = 120000; // 2 minutes per attempt

  /**
   * Run bun update with retry logic
   */
  async function updateWithRetry(cwd: string, label: string): Promise<boolean> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        execSync("bun update", {
          cwd,
          stdio: quiet ? "ignore" : "inherit",
          timeout,
        });
        return true;
      } catch (error) {
        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s
          if (spinner) {
            spinner.text = `${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay / 1000}s...`;
          } else if (!quiet) {
            console.log(
              kleur.yellow(
                `   ⚠ ${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay / 1000}s...`,
              ),
            );
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          // Final attempt failed
          if (!quiet) {
            console.warn(
              kleur.yellow(
                `   ⚠ ${label} failed after ${maxAttempts} attempts`,
              ),
            );
          }
          return false;
        }
      }
    }
    return false;
  }

  try {
    // Update root dependencies with retry
    const rootSuccess = await updateWithRetry(
      projectRoot,
      "Root dependency update",
    );

    // Update UI dependencies with retry
    const uiPath = resolve(projectRoot, "apps/ui");
    let uiSuccess = true;
    if (existsSync(uiPath)) {
      uiSuccess = await updateWithRetry(uiPath, "UI dependency update");
    }

    if (spinner) {
      if (rootSuccess && uiSuccess) {
        spinner.succeed("Dependencies updated");
      } else {
        spinner.warn(
          "Dependencies updated (some failed, using cached versions)",
        );
      }
    }

    // Don't block startup if updates failed - cached dependencies may work
    if (!rootSuccess || !uiSuccess) {
      if (!quiet) {
        console.log(kleur.gray("   Continuing with cached dependencies..."));
      }
    }
  } catch (error) {
    if (spinner) {
      spinner.warn("Dependency update failed, using cached versions");
    }
    if (!quiet) {
      console.warn(
        kleur.yellow(`   Continuing with cached dependencies: ${error}`),
      );
    }
    // Don't throw - allow startup to proceed with cached dependencies
  }
}

function cleanStaleBuilds(projectRoot: string, quiet: boolean): void {
  if (!quiet) {
    console.log(kleur.cyan("🔍 Checking for stale package builds..."));
  }

  const cleaned: string[] = [];
  const packagesToRebuild: string[] = [];

  // Check packages/*/dist folders
  const packagesDir = resolve(projectRoot, "packages");
  if (existsSync(packagesDir)) {
    const packages = readdirSync(packagesDir);
    for (const pkg of packages) {
      const distPath = resolve(packagesDir, pkg, "dist");
      const srcPath = resolve(packagesDir, pkg, "src");

      // Skip if no src directory (not a buildable package)
      if (!existsSync(srcPath)) {
        continue;
      }

      // If dist doesn't exist, we need to build
      if (!existsSync(distPath)) {
        packagesToRebuild.push(pkg);
        continue;
      }

      // dist exists, check if any .ts file is newer than the dist folder
      try {
        // Get the newest file in dist/ (not folder timestamp)
        const distFiles = readdirSync(distPath, { recursive: true })
          .filter(
            (f) =>
              typeof f === "string" &&
              (f.endsWith(".js") || f.endsWith(".d.ts")),
          )
          .map((f) => resolve(distPath, f));

        const distMtime =
          distFiles.length > 0
            ? Math.max(
                ...distFiles.map((f) => {
                  try {
                    return statSync(f).mtimeMs;
                  } catch {
                    return 0;
                  }
                }),
              )
            : 0; // Force rebuild if no dist files exist

        const srcFiles = readdirSync(srcPath, { recursive: true }).filter(
          (f) => typeof f === "string" && f.endsWith(".ts"),
        );

        let hasNewerSource = srcFiles.some((file) => {
          const srcFile = resolve(srcPath, file);
          try {
            return statSync(srcFile).mtimeMs > distMtime;
          } catch {
            return false;
          }
        });

        // CRITICAL FIX: Also check defaults/ folder for db package
        // Seed data changes must trigger rebuilds (per R01: SSOT)
        if (!hasNewerSource && pkg === "db") {
          const defaultsPath = resolve(packagesDir, pkg, "defaults");
          if (existsSync(defaultsPath)) {
            const defaultsFiles = readdirSync(defaultsPath, {
              recursive: true,
            }).filter((f) => typeof f === "string" && f.endsWith(".ts"));

            hasNewerSource = defaultsFiles.some((file) => {
              const defaultsFile = resolve(defaultsPath, file);
              try {
                return statSync(defaultsFile).mtimeMs > distMtime;
              } catch {
                return false;
              }
            });
          }
        }

        if (hasNewerSource) {
          rmSync(distPath, { recursive: true, force: true });
          cleaned.push(`packages/${pkg}/dist`);
          packagesToRebuild.push(pkg);
        }
      } catch {
        // If we can't stat, better to clean it
        rmSync(distPath, { recursive: true, force: true });
        cleaned.push(`packages/${pkg}/dist`);
        packagesToRebuild.push(pkg);
      }
    }
  }

  // Check apps/ui/.next
  const nextBuildPath = resolve(projectRoot, "apps/ui/.next");
  if (existsSync(nextBuildPath)) {
    rmSync(nextBuildPath, { recursive: true, force: true });
    cleaned.push("apps/ui/.next");
  }

  if (cleaned.length > 0 && !quiet) {
    console.log(kleur.yellow(`🧹 Cleaned stale builds: ${cleaned.join(", ")}`));
  }

  // Rebuild cleaned packages
  if (packagesToRebuild.length > 0) {
    if (!quiet) {
      console.log(
        kleur.cyan(`🔨 Rebuilding packages: ${packagesToRebuild.join(", ")}`),
      );
    }

    // Helper function to log to both console and file
    const buildLog = (msg: string, isError: boolean = false) => {
      const timestamp = new Date().toISOString();
      const logMsg = `[${timestamp}] ${msg}`;

      // Ensure logs directory exists
      if (!existsSync(LOGS_DIR)) {
        mkdirSync(LOGS_DIR, { recursive: true });
      }

      // Always log to file
      try {
        appendFileSync(BUILD_LOG_FILE, logMsg + "\n");
      } catch {
        // Ignore file write errors
      }

      // Log to console if not quiet
      if (!quiet) {
        if (isError) {
          console.error(msg);
        } else {
          console.log(msg);
        }
      }
    };

    buildLog(`Detected stale package(s): ${packagesToRebuild.join(", ")}`);
    buildLog(`Rebuilding ALL packages to ensure correct dependency order...`);

    try {
      execSync(`bun run build:packages`, {
        cwd: projectRoot,
        stdio: quiet ? "pipe" : "inherit",
      });
      buildLog(`✓ Successfully rebuilt all packages`);
    } catch (err) {
      const errorMsg = kleur.red(`✗ FATAL: Failed to rebuild packages`);
      const hintMsg = kleur.dim(`  Run manually: bun run build:packages`);
      buildLog(errorMsg, true);
      buildLog(hintMsg, true);
      buildLog(
        `Error details: ${err instanceof Error ? err.message : String(err)}`,
        true,
      );

      // CRITICAL: Throw error to prevent starting with stale packages
      throw new Error(
        `Package rebuild failed. Cannot start services with stale builds.`,
      );
    }

    // Verify all rebuilds succeeded by checking dist directories exist AND contain files
    for (const pkg of packagesToRebuild) {
      const distPath = resolve(packagesDir, pkg, "dist");
      const tsbuildInfoPath = resolve(packagesDir, pkg, "tsconfig.tsbuildinfo");

      // Check if dist exists
      if (!existsSync(distPath)) {
        // If tsbuildinfo exists but dist doesn't, TypeScript thinks it's up to date
        // Force clean rebuild by removing tsbuildinfo
        if (existsSync(tsbuildInfoPath)) {
          buildLog(
            `⚠ Warning: ${pkg}/dist missing but tsbuildinfo exists - forcing clean rebuild`,
            true,
          );
          try {
            rmSync(tsbuildInfoPath, { force: true });
          } catch {
            // Ignore cleanup errors
          }
        }

        // Try to force rebuild this package
        buildLog(`Attempting forced rebuild of ${pkg}...`, true);
        try {
          execSync(`bun run tsc --build packages/${pkg}`, {
            cwd: projectRoot,
            stdio: quiet ? "pipe" : "inherit",
          });
        } catch (err) {
          const errorMsg = kleur.red(
            `✗ FATAL: Rebuild verification failed for '${pkg}' - dist directory missing`,
          );
          buildLog(errorMsg, true);
          buildLog(
            `Error: ${err instanceof Error ? err.message : String(err)}`,
            true,
          );
          throw new Error(
            `Rebuild verification failed: ${pkg}/dist does not exist after build`,
          );
        }
      }

      // Verify dist actually contains compiled files (not just empty directory)
      try {
        const distFiles = readdirSync(distPath, { recursive: true }).filter(
          (f) =>
            typeof f === "string" && (f.endsWith(".js") || f.endsWith(".d.ts")),
        );

        if (distFiles.length === 0) {
          buildLog(
            `⚠ Warning: ${pkg}/dist exists but is empty - forcing clean rebuild`,
            true,
          );
          // Remove dist and tsbuildinfo to force full rebuild
          try {
            rmSync(distPath, { recursive: true, force: true });
            if (existsSync(tsbuildInfoPath)) {
              rmSync(tsbuildInfoPath, { force: true });
            }
          } catch {
            // Ignore cleanup errors
          }

          // Retry build
          buildLog(`Attempting forced rebuild of ${pkg}...`, true);
          try {
            execSync(`bun run tsc --build packages/${pkg}`, {
              cwd: projectRoot,
              stdio: quiet ? "pipe" : "inherit",
            });

            // Verify again after rebuild
            const retryFiles = readdirSync(distPath, {
              recursive: true,
            }).filter(
              (f) =>
                typeof f === "string" &&
                (f.endsWith(".js") || f.endsWith(".d.ts")),
            );

            if (retryFiles.length === 0) {
              const errorMsg = kleur.red(
                `✗ FATAL: Rebuild verification failed for '${pkg}' - dist directory is empty after rebuild`,
              );
              buildLog(errorMsg, true);
              throw new Error(
                `Rebuild verification failed: ${pkg}/dist is empty after build`,
              );
            }
          } catch (err) {
            const errorMsg = kleur.red(
              `✗ FATAL: Rebuild verification failed for '${pkg}' - could not rebuild`,
            );
            buildLog(errorMsg, true);
            buildLog(
              `Error: ${err instanceof Error ? err.message : String(err)}`,
              true,
            );
            throw new Error(
              `Rebuild verification failed: ${pkg}/dist could not be rebuilt`,
            );
          }
        }
      } catch (statErr) {
        // If we can't read dist, something is wrong
        const errorMsg = kleur.red(
          `✗ FATAL: Rebuild verification failed for '${pkg}' - cannot read dist directory`,
        );
        buildLog(errorMsg, true);
        throw new Error(
          `Rebuild verification failed: ${pkg}/dist cannot be read`,
        );
      }
    }

    if (!quiet) {
      console.log(
        kleur.green(
          `✓ Successfully rebuilt ${packagesToRebuild.length} package(s): ${packagesToRebuild.join(", ")}`,
        ),
      );
    }
    buildLog(`All ${packagesToRebuild.length} package(s) rebuilt successfully`);
  }
}

/**
 * Enable health monitoring with auto-restart for detached services
 * Checks services every 30 seconds and restarts if unhealthy
 */
function enableHealthMonitoring(
  serverPort: number,
  uiPort: number,
  noUi: boolean,
): void {
  const monitorInterval = 30000; // 30 seconds
  const maxLogSize = 100 * 1024 * 1024; // 100MB
  let restartCount = { server: 0, ui: 0 };
  const maxRestarts = 3; // Max restarts per service before giving up

  const monitor = setInterval(async () => {
    // Check server health
    try {
      const serverPid = getPid(SERVER_PID_FILE);
      if (serverPid) {
        const response = await fetch(`http://127.0.0.1:${serverPort}/health`, {
          signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
          throw new Error(`Server unhealthy: HTTP ${response.status}`);
        }
      } else {
        // PID file missing - process crashed
        throw new Error("Server process not found");
      }
    } catch (error) {
      console.error(
        kleur.red(
          `\n⚠️  Server health check failed: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );

      if (restartCount.server < maxRestarts) {
        restartCount.server++;
        console.log(
          kleur.yellow(
            `   Attempting to restart server (attempt ${restartCount.server}/${maxRestarts})...`,
          ),
        );

        try {
          // Clean up stale PID
          if (existsSync(SERVER_PID_FILE)) {
            rmSync(SERVER_PID_FILE, { force: true });
          }

          // Restart server
          const projectRoot = getProjectRoot();
          const serverCmd = `bun run apps/server/src/start.ts >> ${SERVER_LOG_FILE} 2>&1`;
          const serverProcess = spawn("sh", ["-c", serverCmd], {
            cwd: projectRoot,
            stdio: "ignore",
            detached: true,
            env: { ...process.env, PORT: String(serverPort) },
          });

          if (serverProcess.pid) {
            savePid(SERVER_PID_FILE, serverProcess.pid);
            serverProcess.unref();
            console.log(
              kleur.green(`   ✓ Server restarted (PID ${serverProcess.pid})`),
            );
          }
        } catch (restartError) {
          console.error(
            kleur.red(`   ✗ Failed to restart server: ${restartError}`),
          );
        }
      } else {
        console.error(
          kleur.red(`   ✗ Server failed ${maxRestarts} times, giving up`),
        );
        console.error(kleur.dim(`     Check logs: ${SERVER_LOG_FILE}`));
      }
    }

    // Check UI health (if enabled)
    if (!noUi) {
      try {
        const uiPid = getPid(UI_PID_FILE);
        if (uiPid) {
          const response = await fetch(`http://127.0.0.1:${uiPort}/`, {
            signal: AbortSignal.timeout(5000),
          });

          if (!response.ok && response.status !== 404) {
            // 404 is acceptable for some pages during development
            throw new Error(`UI unhealthy: HTTP ${response.status}`);
          }
        } else {
          // PID file missing - process crashed
          throw new Error("UI process not found");
        }
      } catch (error) {
        console.error(
          kleur.red(
            `\n⚠️  UI health check failed: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );

        if (restartCount.ui < maxRestarts) {
          restartCount.ui++;
          console.log(
            kleur.yellow(
              `   Attempting to restart UI (attempt ${restartCount.ui}/${maxRestarts})...`,
            ),
          );

          try {
            // Clean up stale PID
            if (existsSync(UI_PID_FILE)) {
              rmSync(UI_PID_FILE, { force: true });
            }

            // Restart UI
            const projectRoot = getProjectRoot();
            const uiCmd = `bun run --cwd apps/ui dev --port ${uiPort} >> ${UI_LOG_FILE} 2>&1`;
            const uiProcess = spawn("sh", ["-c", uiCmd], {
              cwd: projectRoot,
              stdio: "ignore",
              detached: true,
            });

            if (uiProcess.pid) {
              savePid(UI_PID_FILE, uiProcess.pid);
              uiProcess.unref();
              console.log(
                kleur.green(`   ✓ UI restarted (PID ${uiProcess.pid})`),
              );
            }
          } catch (restartError) {
            console.error(
              kleur.red(`   ✗ Failed to restart UI: ${restartError}`),
            );
          }
        } else {
          console.error(
            kleur.red(`   ✗ UI failed ${maxRestarts} times, giving up`),
          );
          console.error(kleur.dim(`     Check logs: ${UI_LOG_FILE}`));
        }
      }
    }

    // Rotate logs if they're too large
    try {
      [SERVER_LOG_FILE, UI_LOG_FILE].forEach((logFile) => {
        if (existsSync(logFile)) {
          const stats = statSync(logFile);
          if (stats.size > maxLogSize) {
            const backupFile = `${logFile}.old`;
            if (existsSync(backupFile)) {
              rmSync(backupFile);
            }
            renameSync(logFile, backupFile);
          }
        }
      });
    } catch (error) {
      // Log rotation is non-critical
    }
  }, monitorInterval);

  // Cleanup on process exit
  process.on("SIGINT", () => clearInterval(monitor));
  process.on("SIGTERM", () => clearInterval(monitor));
}

/**
 * Auto-link CLI globally if not already linked
 * Makes 'bun third-eye-mcp' and 'bunx third-eye-mcp' work everywhere
 */
async function ensureGlobalLink(
  projectRoot: string,
  quiet: boolean,
): Promise<void> {
  try {
    // Check if already linked by testing the command
    execSync("which third-eye-mcp", { stdio: "pipe" });
    if (!quiet) {
      log("✓ CLI already linked globally");
    }
  } catch {
    // Not linked, auto-link now
    if (!quiet) {
      log("🔗 Auto-linking CLI globally...");
    }
    try {
      execSync("bun link", {
        cwd: projectRoot,
        stdio: quiet ? "pipe" : "inherit",
      });
      if (!quiet) {
        log(
          '   ✓ CLI linked: You can now use "bun third-eye-mcp" or "bunx third-eye-mcp"',
        );
      }
    } catch (err) {
      if (!quiet) {
        log(
          '   ⚠ Auto-link failed (not critical, you can still use "bun up")',
        );
      }
    }
  }
}

/**
 * Auto-create .env file from .env.example if it doesn't exist
 * Ensures providers and configuration can work on first run
 */
function ensureEnvFile(projectRoot: string, quiet: boolean): void {
  const envPath = resolve(projectRoot, ".env");
  const examplePath = resolve(projectRoot, ".env.example");

  // If .env already exists, nothing to do
  if (existsSync(envPath)) {
    if (!quiet) {
      log("✓ .env file exists");
    }
    return;
  }

  // If .env.example doesn't exist, can't auto-create
  if (!existsSync(examplePath)) {
    if (!quiet) {
      console.warn("⚠️  No .env.example found, skipping .env creation");
    }
    return;
  }

  // Copy .env.example to .env
  try {
    const exampleContent = readFileSync(examplePath, "utf-8");
    writeFileSync(envPath, exampleContent);

    if (!quiet) {
      console.log("📝 Created .env from .env.example");
      console.log("   ⚠️  Configure your API keys in .env for provider access");
      console.log(`   Location: ${envPath}`);
    }
  } catch (err) {
    if (!quiet) {
      console.warn(
        `⚠️  Failed to create .env: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

async function startServices() {
  const args = parseArgs();
  const projectRoot = getProjectRoot();
  const startTime = Date.now();

  if (!args.quiet) {
    console.log(`\n${kleur.bold().magenta(`🧿 Third Eye MCP v${VERSION}`)}`);
    console.log(kleur.gray("━".repeat(60)));
  }

  // Auto-link CLI globally (non-blocking, best-effort)
  await ensureGlobalLink(projectRoot, args.quiet);

  // Auto-create .env from .env.example if missing
  ensureEnvFile(projectRoot, args.quiet);

  // Nuclear mode: Full clean + reinstall
  if (args.nuclear) {
    if (!args.quiet) {
      console.log(kleur.yellow("\n💣 Nuclear mode: Full clean + reinstall"));
    }
    const nuclearSpinner = args.quiet
      ? null
      : ora("Removing node_modules and build artifacts...").start();
    try {
      execSync(
        "rm -rf node_modules apps/ui/node_modules apps/*/dist packages/*/dist .next",
        {
          cwd: projectRoot,
          stdio: "ignore",
        },
      );
      if (nuclearSpinner) nuclearSpinner.succeed("Cleaned all artifacts");
    } catch (err) {
      if (nuclearSpinner) nuclearSpinner.fail("Clean failed");
    }
  }

  await ensureDependencies(!args.quiet);
  checkEnvironment();

  // Quick mode: Skip updates and stale checks (but ALWAYS clean .next for module resolution)
  if (!args.quick) {
    await updateDependencies(projectRoot, args.skipUpdate || false, args.quiet);
    cleanSourceArtifacts(projectRoot, args.quiet);
    cleanStaleBuilds(projectRoot, args.quiet);
  } else {
    if (!args.quiet) {
      console.log(
        kleur.gray("⏭️  Quick mode: Skipping updates and stale checks"),
      );
    }
    // CRITICAL: Always clean .next even in quick mode (fixes module resolution issues)
    const nextBuildPath = resolve(projectRoot, "apps/ui/.next");
    if (existsSync(nextBuildPath)) {
      rmSync(nextBuildPath, { recursive: true, force: true });
      if (!args.quiet) {
        console.log(
          kleur.yellow(
            "🧹 Cleaned apps/ui/.next (required for module resolution)",
          ),
        );
      }
    }
  }

  await prepareDatabase(!args.quiet);
  await cleanStaleProcesses([args.port || SERVER_PORT, args.uiPort || UI_PORT]);

  if (!args.quiet) {
    log(
      `\n${kleur.green("🚀 Starting services")}${args.foreground ? kleur.gray(" (foreground)") : kleur.gray(" (detached)")}...`,
    );
  }

  const serverStartTime = Date.now();

  // Use shell redirection for logging in detached mode (Bun doesn't support stream.Writable in stdio)
  const serverCmd = args.foreground
    ? "bun run apps/server/src/start.ts"
    : `bun run apps/server/src/start.ts >> ${SERVER_LOG_FILE} 2>&1`;

  const serverProcess = args.foreground
    ? spawn("bun", ["run", "apps/server/src/start.ts"], {
        cwd: projectRoot,
        stdio: "inherit",
        detached: false,
        env: { ...process.env, PORT: String(args.port || SERVER_PORT) },
      })
    : spawn("sh", ["-c", serverCmd], {
        cwd: projectRoot,
        stdio: "ignore",
        detached: true,
        env: { ...process.env, PORT: String(args.port || SERVER_PORT) },
      });

  // Monitor for unexpected process exits
  serverProcess.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(kleur.red(`\n✗ Server process exited with code ${code}`));
      console.error(kleur.dim(`  Check logs: ${SERVER_LOG_FILE}`));
      if (!args.foreground) {
        try {
          rmSync(SERVER_PID_FILE, { force: true });
        } catch {}
      }
    }
  });

  if (!args.foreground) {
    savePid(SERVER_PID_FILE, serverProcess.pid!);
    serverProcess.unref();
  }

  let serverSpinner: Ora | null = null;
  if (!args.quiet) {
    serverSpinner = ora({
      text: `Server starting on port ${args.port || SERVER_PORT}...`,
      spinner: "dots",
    }).start();
  }
  const serverHealthy = await waitForHealth(
    `http://127.0.0.1:${args.port || SERVER_PORT}/health`,
    "Server",
    30,
  );
  const serverTime = ((Date.now() - serverStartTime) / 1000).toFixed(1);

  if (serverSpinner) {
    if (serverHealthy) {
      serverSpinner.succeed(kleur.green(`Server healthy (${serverTime}s)`));
    } else {
      serverSpinner.warn(
        kleur.yellow(
          "Server may still be starting (check status); health endpoint not ready.",
        ),
      );
    }
  } else {
    log(
      serverHealthy
        ? `   ✓ Server healthy (${serverTime}s)`
        : `   ⚠ Server may still be starting (check status in a moment)`,
    );
  }

  let uiHealthy = false;
  let uiProcess: ChildProcess | null = null;
  if (!args.noUi) {
    const uiStartTime = Date.now();

    // Use shell redirection for logging in detached mode (Bun doesn't support stream.Writable in stdio)
    const uiCmd = args.foreground
      ? `bun --bun --cwd apps/ui run dev --port ${args.uiPort || UI_PORT}`
      : `bun --bun --cwd apps/ui run dev --port ${args.uiPort || UI_PORT} >> ${UI_LOG_FILE} 2>&1`;

    uiProcess = args.foreground
      ? spawn(
          "bun",
          [
            "--bun",
            "run",
            "--cwd",
            "apps/ui",
            "dev",
            "--port",
            String(args.uiPort || UI_PORT),
          ],
          {
            cwd: projectRoot,
            stdio: "inherit",
            detached: false,
          },
        )
      : spawn("sh", ["-c", uiCmd], {
          cwd: projectRoot,
          stdio: "ignore",
          detached: true,
        });

    // Monitor for unexpected process exits
    uiProcess.on("exit", (code, signal) => {
      if (code !== 0 && code !== null) {
        console.error(kleur.red(`\n✗ UI process exited with code ${code}`));
        console.error(kleur.dim(`  Check logs: ${UI_LOG_FILE}`));
        if (!args.foreground) {
          try {
            rmSync(UI_PID_FILE, { force: true });
          } catch {}
        }
      }
    });

    if (!args.foreground) {
      savePid(UI_PID_FILE, uiProcess.pid!);
      uiProcess.unref();
    }

    let uiSpinner: Ora | null = null;
    if (!args.quiet) {
      uiSpinner = ora({
        text: `UI starting on port ${args.uiPort || UI_PORT}...`,
        spinner: "dots",
      }).start();
    }
    uiHealthy = await waitForHealth(
      `http://127.0.0.1:${args.uiPort || UI_PORT}`,
      "UI",
      30,
    );
    const uiTime = ((Date.now() - uiStartTime) / 1000).toFixed(1);

    if (uiSpinner) {
      if (uiHealthy) {
        uiSpinner.succeed(kleur.green(`UI ready (${uiTime}s)`));
      } else {
        uiSpinner.warn(
          kleur.yellow("UI may still be starting; visit the URL to confirm."),
        );
      }
    } else {
      log(
        uiHealthy
          ? `   ✓ UI ready (${uiTime}s)`
          : `   ⚠ UI may still be starting`,
      );
    }
  }

  // Fail-fast: Exit immediately if critical services failed health checks
  if (!serverHealthy) {
    console.error(
      kleur.red("\n✗ STARTUP FAILED: Server did not become healthy"),
    );
    console.error(kleur.dim(`  Logs: ${SERVER_LOG_FILE}`));
    console.error(
      kleur.dim(`  Try: cd ${projectRoot} && bun run --cwd apps/server dev`),
    );
    console.error(kleur.dim(`       (to see error details)`));
    process.exit(1);
  }

  if (!uiHealthy && !args.noUi) {
    console.error(kleur.red("\n✗ STARTUP FAILED: UI did not become healthy"));
    console.error(kleur.dim(`  Logs: ${UI_LOG_FILE}`));
    console.error(kleur.dim(`  Common causes:`));
    console.error(kleur.dim(`    - TypeScript compilation errors`));
    console.error(
      kleur.dim(`    - Port ${args.uiPort || UI_PORT} already in use`),
    );
    console.error(kleur.dim(`    - Missing dependencies (try: bun install)`));
    console.error(
      kleur.dim(`  Try: cd ${projectRoot} && bun run --cwd apps/ui dev`),
    );
    console.error(kleur.dim(`       (to see error details)`));
    process.exit(1);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  if (!args.quiet) {
    console.log(
      `\n${kleur.bold(kleur.green(`✨ Started in ${totalTime}s`))}\n`,
    );
    console.log(kleur.bold().magenta("🧿 Third-Eye MCP — READY"));
    console.log(kleur.gray("━".repeat(60)));
    console.log(
      `• Server: ${kleur.cyan(`http://127.0.0.1:${args.port || SERVER_PORT}`)} ${serverHealthy ? kleur.green("✓") : kleur.red("✗ FAILED")}`,
    );
    if (!args.noUi) {
      console.log(
        `• UI:     ${kleur.cyan(`http://127.0.0.1:${args.uiPort || UI_PORT}`)} ${uiHealthy ? kleur.green("✓") : kleur.red("✗ FAILED")}`,
      );
    }
    console.log(`• DB:     ${kleur.cyan(`~/${DATA_DIRECTORY}/mcp.db`)}`);
    console.log(`• Logs:   ${kleur.cyan(`~/${DATA_DIRECTORY}/logs/`)}`);
    if (!args.foreground) {
      const serverPid = getPid(SERVER_PID_FILE);
      const uiPid = !args.noUi ? getPid(UI_PID_FILE) : null;
      console.log(
        `• PIDs:   server(${serverPid})${uiPid ? ` ui(${uiPid})` : ""}`,
      );
    }
    console.log(`\n${kleur.cyan("📖 Next steps:")}`);
    console.log(`   ${kleur.yellow(`${CLI_EXEC} status`)}  - Check status`);
    console.log(`   ${kleur.yellow(`${CLI_EXEC} logs`)}    - View logs`);
    console.log(`   ${kleur.yellow(`${CLI_EXEC} stop`)}    - Stop services`);

    if (args.foreground) {
      console.log(kleur.gray("\nRunning in foreground. Press Ctrl+C to stop."));
    } else {
      console.log(
        kleur.gray("\nRunning in background. Safe to close terminal."),
      );
    }
  }

  if (args.foreground) {
    const shutdown = () => {
      console.log("\n📴 Shutting down services...");
      if (serverProcess.pid) process.kill(serverProcess.pid, "SIGTERM");
      if (!args.noUi && uiProcess && uiProcess.pid)
        process.kill(uiProcess.pid, "SIGTERM");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    await new Promise(() => {});
  } else {
    // Enable health monitoring for detached mode
    // This will automatically restart services if they crash
    enableHealthMonitoring(
      args.port || SERVER_PORT,
      args.uiPort || UI_PORT,
      args.noUi || false,
    );
  }
}

async function stopServices() {
  console.log("📴 Stopping services...\n");

  const serverPid = getPid(SERVER_PID_FILE);
  const uiPid = getPid(UI_PID_FILE);

  let stopped = 0;

  if (serverPid) {
    try {
      process.kill(serverPid, "SIGTERM");
      console.log(`   ✓ Server stopped (PID ${serverPid})`);
      rmSync(SERVER_PID_FILE);
      stopped++;
    } catch (err) {
      console.log(`   ⚠ Server not running`);
    }
  }

  if (uiPid) {
    try {
      process.kill(uiPid, "SIGTERM");
      console.log(`   ✓ UI stopped (PID ${uiPid})`);
      rmSync(UI_PID_FILE);
      stopped++;
    } catch (err) {
      console.log(`   ⚠ UI not running`);
    }
  }

  if (stopped === 0) {
    console.log("   ℹ No services were running");
  } else {
    console.log(`\n✅ Stopped ${stopped} service${stopped > 1 ? "s" : ""}`);
  }
}

async function showStatus() {
  console.log("🧿 Third Eye MCP - Status");
  console.log("━".repeat(60));

  const serverPid = getPid(SERVER_PID_FILE);
  const uiPid = getPid(UI_PID_FILE);

  if (serverPid) {
    try {
      const stats = execSync(`ps -o etime,rss -p ${serverPid}`)
        .toString()
        .split("\n")[1]
        .trim()
        .split(/\s+/);
      const uptime = stats[0];
      const memory = Math.round(parseInt(stats[1]) / 1024);
      console.log(`Server:  ✓ Running (PID ${serverPid}, uptime ${uptime})`);
      console.log(`         Memory: ${memory}MB`);

      const healthCheck = await waitForHealth(
        `http://127.0.0.1:${SERVER_PORT}/health`,
        1,
      );
      if (healthCheck) {
        console.log(`         Health: ✓ Responding`);
      }
    } catch {
      console.log(`Server:  ✗ Process not found`);
    }
  } else {
    console.log("Server:  ○ Not running");
  }

  if (uiPid) {
    try {
      const stats = execSync(`ps -o etime,rss -p ${uiPid}`)
        .toString()
        .split("\n")[1]
        .trim()
        .split(/\s+/);
      const uptime = stats[0];
      const memory = Math.round(parseInt(stats[1]) / 1024);
      console.log(`UI:      ✓ Running (PID ${uiPid}, uptime ${uptime})`);
      console.log(`         Memory: ${memory}MB`);
    } catch {
      console.log(`UI:      ✗ Process not found`);
    }
  } else {
    console.log("UI:      ○ Not running");
  }

  console.log("━".repeat(60));
}

async function showLogs() {
  const args = parseArgs();

  if (args.tail) {
    console.log("📜 Tailing logs (Ctrl+C to stop)...\n");
    const tail = spawn("tail", ["-f", SERVER_LOG_FILE, UI_LOG_FILE], {
      stdio: "inherit",
    });
    await new Promise(() => {});
  } else {
    console.log("📜 Recent logs:\n");
    console.log("━ SERVER ━".repeat(10));
    try {
      const serverLogs = execSync(`tail -20 ${SERVER_LOG_FILE}`).toString();
      console.log(serverLogs);
    } catch {
      console.log("No server logs available");
    }

    console.log("\n━ UI ━".repeat(10));
    try {
      const uiLogs = execSync(`tail -20 ${UI_LOG_FILE}`).toString();
      console.log(uiLogs);
    } catch {
      console.log("No UI logs available");
    }

    console.log("\n💡 Use --tail to follow logs in real-time");
  }
}

async function restartServices() {
  await stopServices();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await startServices();
}

async function startMCPServer() {
  await ensureDependencies(true);
  const projectRoot = getProjectRoot();
  console.log("🧿 Starting Third Eye MCP Server (stdio mode)...\n");

  const server = spawn("bun", ["run", "bin/mcp-server.ts"], {
    cwd: projectRoot,
    stdio: "inherit",
  });

  server.on("exit", (code) => {
    process.exit(code || 0);
  });

  await new Promise(() => {});
}

async function openDbBrowser() {
  console.log("🗄️  Opening DB browser...");
  const url = `http://127.0.0.1:${UI_PORT}/db`;

  const command =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";

  spawn(command, [url], { detached: true, stdio: "ignore" });
}

function bumpVersion(
  current: string,
  type: "patch" | "minor" | "major",
): string {
  const parts = current.split(".").map((num) => parseInt(num, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Invalid semantic version: ${current}`);
  }

  let [major, minor, patch] = parts;
  switch (type) {
    case "patch":
      patch += 1;
      break;
    case "minor":
      minor += 1;
      patch = 0;
      break;
    case "major":
      major += 1;
      minor = 0;
      patch = 0;
      break;
  }

  return `${major}.${minor}.${patch}`;
}

async function runReleaseAssistant() {
  const projectRoot = getProjectRoot();
  console.log("\n🚀 Third Eye MCP Release Assistant");
  console.log("━".repeat(60));
  console.log(`Current version: v${VERSION}`);

  const gitStatus = execSync("git status --porcelain", { cwd: projectRoot })
    .toString()
    .trim();
  if (gitStatus.length > 0) {
    const proceed = await confirm({
      message: "Working tree is dirty. Continue anyway?",
      default: false,
    });
    if (!proceed) {
      console.log("Release aborted. Clean your working tree and retry.");
      return;
    }
  }

  const bumpChoice = await select<{ value: string } | string>({
    message: "Select version bump",
    choices: [
      { name: `Patch (${bumpVersion(VERSION, "patch")})`, value: "patch" },
      { name: `Minor (${bumpVersion(VERSION, "minor")})`, value: "minor" },
      { name: `Major (${bumpVersion(VERSION, "major")})`, value: "major" },
      { name: "Custom…", value: "custom" },
      { name: "Abort", value: "abort" },
    ],
  });

  if (bumpChoice === "abort") {
    console.log("Release aborted.");
    return;
  }

  let targetVersion: string;
  if (bumpChoice === "custom") {
    targetVersion = await input({
      message: "Enter the new version (semver)",
      default: VERSION,
      validate: (value) =>
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/.test(
          value,
        ) || "Invalid semantic version",
    });
  } else {
    targetVersion = bumpVersion(
      VERSION,
      bumpChoice as "patch" | "minor" | "major",
    );
  }

  const confirmed = await confirm({
    message: `Apply version v${targetVersion}?`,
    default: true,
  });

  if (!confirmed) {
    console.log("Release aborted.");
    return;
  }

  console.log("\n📝 Updating package version...");
  execSync(`npm version ${targetVersion} --no-git-tag-version`, {
    cwd: projectRoot,
    stdio: "inherit",
  });

  const changelogPath = resolve(projectRoot, "CHANGELOG.md");
  const addNotes = await confirm({
    message: "Add release notes to CHANGELOG.md?",
    default: true,
  });

  if (addNotes) {
    const notes = await input({
      message: "Release summary (Markdown)",
      default: "- TBD",
    });

    const existing = existsSync(changelogPath)
      ? readFileSync(changelogPath, "utf-8")
      : "# Changelog\n\n";
    const date = new Date().toISOString().split("T")[0];
    const entry = `## v${targetVersion} - ${date}\n\n${notes}\n\n`;
    writeFileSync(
      changelogPath,
      `${existing.startsWith("# Changelog") ? existing : `# Changelog\n\n${existing}`}`.replace(
        "# Changelog",
        `# Changelog\n\n${entry}`,
      ),
    );
  }

  console.log("\n✅ Version updated.");
  try {
    const entry = {
      version: targetVersion,
      date: new Date().toISOString(),
      changelog: addNotes ? "updated" : "skipped",
    };

    let history: Array<typeof entry> = [];
    if (existsSync(RELEASE_HISTORY_FILE)) {
      history = JSON.parse(readFileSync(RELEASE_HISTORY_FILE, "utf-8"));
    }
    history.unshift(entry);
    writeFileSync(
      RELEASE_HISTORY_FILE,
      JSON.stringify(history.slice(0, 20), null, 2),
    );
    console.log(`🗂  Release history updated (${RELEASE_HISTORY_FILE})`);
  } catch (error) {
    console.warn(
      "⚠️  Failed to persist release history:",
      error instanceof Error ? error.message : error,
    );
  }

  console.log("\nNext steps:");
  console.log("  1. Review git diff and stage files.");
  console.log("  2. Run `bun run release:prepare:dry` to verify artifacts.");
  console.log("  3. Commit & tag release.");
  console.log("  4. Publish with `bun run release:publish`.");
}

async function resetData() {
  const confirmed = await confirm({
    message: `This will permanently delete all data in ~/${DATA_DIRECTORY}. Continue?`,
    default: false,
  });

  if (!confirmed) {
    console.log("Reset cancelled.");
    return;
  }

  try {
    rmSync(THIRD_EYE_DIR, { recursive: true, force: true });
    console.log("✅ Data reset successfully.");
    console.log(`💡 Run "${CLI_EXEC} up" to reinitialize.`);
  } catch (error) {
    console.error("❌ Failed to reset data:", error);
    process.exit(1);
  }
}

async function main() {
  const args = parseArgs();

  if (
    args.command === "--help" ||
    args.command === "-h" ||
    args.command === "help"
  ) {
    showHelp();
    return;
  }

  try {
    switch (args.command) {
      case "up":
        await startServices();
        break;

      case "stop":
        await stopServices();
        break;

      case "restart":
        await restartServices();
        break;

      case "status":
        await showStatus();
        break;

      case "logs":
        await showLogs();
        break;

      case "server":
        await startMCPServer();
        break;

      case "db":
        if (process.argv[3] === "open") {
          await openDbBrowser();
        } else {
          console.error(`❌ Unknown db command. Try: ${CLI_EXEC} db open`);
          process.exit(1);
        }
        break;

      case "reset":
        await resetData();
        break;

      case "release":
        await runReleaseAssistant();
        break;

      case "release:ship":
        await runReleasePipeline();
        break;

      default:
        console.error(`❌ Unknown command: ${args.command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Command failed:", error);
    console.error(`\n💡 For help, run: ${CLI_EXEC} --help`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
