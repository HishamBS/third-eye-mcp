# 🔍 Automation Gaps - Technical Analysis

**Focus:** What's broken, what's missing, how to fix it.

**Status Update:** Tier 1 blockers (issues #1-3) have been COMPLETED and are now part of the automated startup flow.

---

## 🔥 Critical Breaks (Fix First)

### ✅ TIER 1 COMPLETED

### 1. ✅ Windows Users Can't Use The App At All - FIXED

**Status:** COMPLETED - Cross-platform process management implemented

**File:** `cli/index.ts` (lines 507-638)

**Implementation:**

- ✅ `cleanStaleProcesses()` now uses `netstat`/`taskkill` on Windows, `lsof`/`kill` on Unix
- ✅ `killProcessesByPattern()` uses `tasklist`/`taskkill` on Windows, `ps`/`grep` on Unix
- ✅ `checkEnvironment()` uses `netstat` on Windows for port checking
- ✅ All process management functions are cross-platform

**Benefit:** Windows, macOS, and Linux users can now run the app without modification

---

### 2. ✅ No .env File Created - Providers Don't Work - FIXED

**Status:** COMPLETED - Auto-creates .env from .env.example

**File:** `cli/index.ts` (lines 1217-1256)

**Implementation:**

- ✅ `ensureEnvFile()` function added
- ✅ Auto-creates .env from .env.example if missing
- ✅ Displays clear message with location and instructions
- ✅ Called automatically during startup (line 1272)

**Benefit:** Users immediately know where to configure API keys for providers

---

### 3. ✅ Missing Environment Checks - FIXED

**Status:** COMPLETED - Comprehensive pre-flight validation

**File:** `cli/index.ts` (lines 431-505)

**Implementation:**

- ✅ Git installation check (required for dependencies)
- ✅ Memory check (warns if < 2GB free)
- ✅ Cross-platform port checking
- ✅ Clear error messages with install instructions

**Benefit:** Users get actionable error messages before startup fails

---

## ⚠️ Remaining Gaps

### 4. First-Time Users Lost After Clone

**Problem:**

```bash
git clone repo
cd repo
# Now what? No guidance, no wizard, no setup
```

**Fix:**
Create interactive setup wizard that runs on first `bun install`:

```typescript
// scripts/first-time-setup.ts
async function firstTimeSetup() {
  console.log("🧿 First-Time Setup\n");

  // Check if .env exists
  if (!existsSync(".env")) {
    const setupProviders = await confirm({
      message: "Configure API providers now?",
      default: true,
    });

    if (setupProviders) {
      const groqKey = await input({
        message: "Groq API key (recommended):",
        validate: (v) => v.startsWith("gsk_") || "Invalid Groq key",
      });

      // Write to .env
      writeFileSync(".env", `GROQ_API_KEY=${groqKey}\n`);
      console.log("✓ Configuration saved");
    }
  }

  console.log("\n✅ Setup complete! Run: bun up\n");
}
```

Trigger from `postinstall.ts`:

```typescript
// Only run on first install
if (!existsSync(".env") && !process.env.CI) {
  await firstTimeSetup();
}
```

---

## ⚠️ Crashes & Recovery

### 5. No Health Monitoring After Startup

**Problem:**

- Server crashes → stays dead
- UI crashes → stays dead
- No auto-restart
- Logs grow unbounded

**Fix:**

```typescript
// Add after successful startup
function enableHealthMonitoring(serverPort: number, uiPort: number) {
  setInterval(async () => {
    // Check server
    try {
      await fetch(`http://127.0.0.1:${serverPort}/health`, {
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      console.error("⚠️  Server down, restarting...");
      restartServer();
    }

    // Check UI
    try {
      await fetch(`http://127.0.0.1:${uiPort}/`, {
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      console.error("⚠️  UI down, restarting...");
      restartUI();
    }

    // Rotate logs if > 100MB
    rotateLogs();
  }, 30000); // Every 30 sec
}
```

---

### 6. Network Failures Are Fatal

**File:** `cli/index.ts:801`

**Problem:**

```typescript
execSync('bun update', ...);  // ❌ Fails if registry down, no retry
```

**Fix:**

```typescript
async function updateDependencies(projectRoot: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      execSync("bun update", { cwd: projectRoot, timeout: 60000 });
      return;
    } catch (err) {
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.warn("⚠️  Update failed, using cached dependencies");
        return; // Don't block startup
      }
    }
  }
}
```

---

## 📦 Package & Build Issues

### 7. Lock File Conflicts Break Everything

**Problem:**

- Merge conflicts in `bun.lock` → corrupted
- No detection, just fails silently

**Fix:**

```typescript
function validateLockFile(projectRoot: string) {
  const lockPath = resolve(projectRoot, "bun.lock");
  try {
    JSON.parse(readFileSync(lockPath, "utf-8"));
  } catch {
    console.error("❌ bun.lock corrupted or has merge conflicts");
    console.error("   Fixing: rm bun.lock && bun install");
    rmSync(lockPath);
    execSync("bun install", { cwd: projectRoot, stdio: "inherit" });
  }
}
```

---

### 8. No Workspace Version Validation

**Problem:**

- Packages can have mismatched dependency versions
- No circular dependency detection
- No validation of workspace:\* protocol

**Fix:**

```typescript
function validateWorkspace(projectRoot: string) {
  const packages = readdirSync(resolve(projectRoot, "packages"));

  for (const pkg of packages) {
    const pkgJson = require(
      resolve(projectRoot, "packages", pkg, "package.json"),
    );

    // Check workspace deps use workspace:*
    for (const [name, version] of Object.entries(pkgJson.dependencies || {})) {
      if (name.startsWith("@third-eye/") && version !== "workspace:*") {
        console.error(
          `❌ ${pkg}: ${name} should use "workspace:*", not "${version}"`,
        );
        process.exit(1);
      }
    }
  }
}
```

---

## 🛠️ Developer Experience

### 9. Git Hooks Not Auto-Configured

**Problem:**

- Husky installed but hooks not set up
- No pre-commit type checking
- No pre-commit linting

**Fix:**

```bash
# .husky/pre-commit (auto-create in postinstall)
#!/bin/sh
bun run lint:packages || exit 1
bun run format:check || exit 1
```

```typescript
// scripts/postinstall.ts
function setupGitHooks() {
  const huskyDir = resolve(".husky");
  const preCommit = resolve(huskyDir, "pre-commit");

  if (!existsSync(preCommit)) {
    mkdirSync(huskyDir, { recursive: true });
    writeFileSync(
      preCommit,
      `#!/bin/sh
bun run lint:packages || exit 1
bun run format:check || exit 1
`,
    );
    chmodSync(preCommit, 0o755);
  }
}
```

---

### 10. VS Code Settings Not Auto-Created

**Problem:**

- No debug configs
- No recommended extensions
- No editor settings

**Fix:**

```typescript
// scripts/postinstall.ts
function setupVSCode() {
  const vscodeDir = resolve(".vscode");

  if (!existsSync(vscodeDir)) {
    mkdirSync(vscodeDir);

    // settings.json
    writeFileSync(
      resolve(vscodeDir, "settings.json"),
      JSON.stringify(
        {
          "typescript.tsdk": "node_modules/typescript/lib",
          "editor.formatOnSave": true,
          "editor.codeActionsOnSave": { "source.fixAll": true },
        },
        null,
        2,
      ),
    );

    // launch.json
    writeFileSync(
      resolve(vscodeDir, "launch.json"),
      JSON.stringify(
        {
          configurations: [
            {
              name: "Debug Server",
              type: "bun",
              request: "launch",
              program: "${workspaceFolder}/apps/server/src/start.ts",
            },
          ],
        },
        null,
        2,
      ),
    );
  }
}
```

---

## 🧪 Testing & CI

### 11. No Cross-Platform CI

**Problem:**

- Windows completely untested
- Mac Intel vs ARM not tested
- Only Ubuntu tested

**Fix:**

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun up --quick
      - run: bun test
```

---

## 📊 Priority Matrix

| Issue                   | Impact | Users Affected         | Status       |
| ----------------------- | ------ | ---------------------- | ------------ |
| Windows process killing | HIGH   | All Windows users      | ✅ COMPLETED |
| .env not created        | HIGH   | First-time users       | ✅ COMPLETED |
| Missing env checks      | HIGH   | Users missing Git      | ✅ COMPLETED |
| No first-time wizard    | MEDIUM | First-time users       | ⚠️ PENDING   |
| No health monitoring    | HIGH   | Production deployments | ⚠️ PENDING   |
| Network retry           | MEDIUM | Poor connections       | ⚠️ PENDING   |
| Lock file validation    | MEDIUM | Contributors           | ⚠️ PENDING   |
| Git hooks               | LOW    | Contributors           | ⚠️ PENDING   |
| VS Code setup           | LOW    | VS Code users          | ⚠️ PENDING   |
| Cross-platform CI       | MEDIUM | Contributors           | ⚠️ PENDING   |

---

## 🎯 Implementation Order

### Tier 1 - Blockers ✅ COMPLETED

1. ✅ Windows process killing
2. ✅ .env auto-creation
3. ✅ Environment validation

### Tier 2 - High Impact

4. First-time setup wizard
5. Health monitoring
6. Network retry logic

### Tier 3 - DX Improvements

7. Lock file validation
8. Git hooks setup
9. VS Code auto-config
10. Cross-platform CI

---

## 📝 Files to Modify

### Core CLI:

- `cli/index.ts` - Main changes
  - Line 510: Windows process killing
  - Line 725: Environment checks
  - Line 801: Network retry
  - Add health monitoring
  - Add .env creation

### Setup Scripts:

- `scripts/postinstall.ts`
  - Add first-time wizard trigger
  - Add git hooks setup
  - Add VS Code setup

- `scripts/first-time-setup.ts` (NEW)
  - Interactive wizard
  - API key validation
  - Config generation

### Configuration:

- `.husky/pre-commit` (NEW)
  - Auto-created on install
  - Runs type check + lint

- `.vscode/settings.json` (NEW)
  - Auto-created on install
  - TypeScript + formatting config

- `.vscode/launch.json` (NEW)
  - Debug configurations

- `.github/workflows/ci.yml` (NEW)
  - Cross-platform testing

---

## ✅ What's Already Automated

Don't need to fix these:

✅ Workspace package discovery (Next.js transpilePackages)
✅ CLI global linking (auto bun link)
✅ .next cache cleanup (every startup)
✅ Database migration & seeding
✅ Port conflict detection (cross-platform)
✅ Stale build detection
✅ Source artifact cleanup
✅ Health checks with retry (startup only)
✅ **NEW:** Cross-platform process management (Windows/macOS/Linux)
✅ **NEW:** .env auto-creation from .env.example
✅ **NEW:** Git installation validation
✅ **NEW:** Memory availability checks

---

**Tier 1 Blockers Complete.** Focus on remaining Tier 2+ gaps above.
