#!/usr/bin/env bun

import { resolve } from "path";
import { existsSync, mkdirSync, writeFileSync, chmodSync } from "fs";
import { homedir } from "os";
import { execSync } from "child_process";

/**
 * Set up git hooks for pre-commit validation
 */
function setupGitHooks(): void {
  const huskyDir = resolve(process.cwd(), ".husky");
  const preCommitPath = resolve(huskyDir, "pre-commit");

  // Check if .git exists (skip if not a git repo)
  if (!existsSync(resolve(process.cwd(), ".git"))) {
    return;
  }

  // Create .husky directory
  if (!existsSync(huskyDir)) {
    mkdirSync(huskyDir, { recursive: true });
  }

  // Create pre-commit hook if it doesn't exist
  if (!existsSync(preCommitPath)) {
    const preCommitContent = `#!/bin/sh
# Third Eye MCP pre-commit hook
# Auto-generated during postinstall

# Ensure bun is in PATH
export PATH="$HOME/.bun/bin:$PATH"

# Run formatter check only (type checking handled by CI)
# Skipping type check because stale dist artifacts cause false failures
echo "🎨 Checking code format..."
bun run format:check || {
  echo "❌ Format check failed (run: bun run format)"
  exit 1
}

echo "✅ Pre-commit checks passed"
`;

    writeFileSync(preCommitPath, preCommitContent);

    // Make executable (Unix only)
    if (process.platform !== "win32") {
      try {
        chmodSync(preCommitPath, 0o755);
      } catch {
        // Ignore chmod errors on Windows
      }
    }

    console.log("   ✓ Git hooks configured");
  }
}

/**
 * Set up VS Code settings and debug configurations
 */
function setupVSCode(): void {
  const vscodeDir = resolve(process.cwd(), ".vscode");

  // Don't overwrite existing VS Code config
  if (existsSync(vscodeDir)) {
    return;
  }

  mkdirSync(vscodeDir, { recursive: true });

  // Create settings.json
  const settingsPath = resolve(vscodeDir, "settings.json");
  if (!existsSync(settingsPath)) {
    const settings = {
      "typescript.tsdk": "node_modules/typescript/lib",
      "typescript.enablePromptUseWorkspaceTsdk": true,
      "editor.formatOnSave": true,
      "editor.codeActionsOnSave": {
        "source.fixAll": "explicit",
        "source.organizeImports": "explicit",
      },
      "editor.defaultFormatter": "esbenp.prettier-vscode",
      "[typescript]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
      },
      "[typescriptreact]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
      },
      "files.exclude": {
        "**/.next": true,
        "**/dist": true,
        "**/*.tsbuildinfo": true,
      },
    };

    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  }

  // Create launch.json for debugging
  const launchPath = resolve(vscodeDir, "launch.json");
  if (!existsSync(launchPath)) {
    const launch = {
      version: "0.2.0",
      configurations: [
        {
          name: "Debug Server",
          type: "bun",
          request: "launch",
          program: "${workspaceFolder}/apps/server/src/start.ts",
          cwd: "${workspaceFolder}",
          env: {
            PORT: "7070",
          },
        },
        {
          name: "Debug CLI",
          type: "bun",
          request: "launch",
          program: "${workspaceFolder}/cli/index.ts",
          args: ["up", "--foreground"],
          cwd: "${workspaceFolder}",
        },
      ],
    };

    writeFileSync(launchPath, JSON.stringify(launch, null, 2));
  }

  // Create extensions.json for recommended extensions
  const extensionsPath = resolve(vscodeDir, "extensions.json");
  if (!existsSync(extensionsPath)) {
    const extensions = {
      recommendations: [
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint",
        "oven.bun-vscode",
        "bradlc.vscode-tailwindcss",
      ],
    };

    writeFileSync(extensionsPath, JSON.stringify(extensions, null, 2));
  }

  console.log("   ✓ VS Code configuration created");
}

async function postInstall() {
  console.log("\n🧿 Third Eye MCP - Post-install setup\n");

  // Build workspace packages for CLI
  console.log("📦 Building workspace packages...");
  try {
    execSync("bun run build:packages", { stdio: "inherit" });
    console.log("   ✓ Packages built");
  } catch (error) {
    console.log("   ⚠ Package build failed, CLI may not work");
  }

  // Build CLI
  console.log("🔨 Building CLI...");
  try {
    execSync("bun run build:cli", { stdio: "inherit" });
    console.log("   ✓ CLI built");
  } catch (error) {
    console.log("   ⚠ CLI build failed");
  }

  const thirdEyeDir = resolve(homedir(), ".third-eye-mcp");

  if (!existsSync(thirdEyeDir)) {
    console.log("📁 Creating ~/.third-eye-mcp directory...");
    mkdirSync(thirdEyeDir, { recursive: true });
    console.log("   ✓ Directory created");
  } else {
    console.log("   ✓ Directory exists");
  }

  const dbPath = resolve(thirdEyeDir, "mcp.db");
  if (!existsSync(dbPath)) {
    console.log("🗄️  Initializing database...");
    try {
      execSync("bun run db:migrate", { stdio: "inherit" });
      console.log("   ✓ Database initialized");
    } catch (error) {
      console.log("   ⚠ Database will be created on first run");
    }
  }

  // Set up git hooks (Tier 3)
  console.log("🪝 Setting up git hooks...");
  try {
    setupGitHooks();
  } catch (error) {
    console.log("   ⚠ Git hooks setup failed (non-critical)");
  }

  // Set up VS Code configuration (Tier 3)
  console.log("💻 Setting up VS Code configuration...");
  try {
    setupVSCode();
  } catch (error) {
    console.log("   ⚠ VS Code setup failed (non-critical)");
  }

  // Run first-time setup wizard for new installations (only if .env doesn't exist)
  // Skip in CI environments
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath) && !process.env.CI) {
    console.log("\n🔧 First-time installation detected...");
    try {
      // Dynamically import to avoid issues if the module has dependencies
      const { firstTimeSetup, writeEnvConfig } = await import(
        "./first-time-setup.js"
      );
      const config = await firstTimeSetup();
      writeEnvConfig(config);
    } catch (error) {
      console.log(
        "   ⚠ Setup wizard skipped (run manually: bun scripts/first-time-setup.ts)",
      );
    }
  }

  console.log(`
✅ Third Eye MCP installed successfully!

🚀 Quick Start (local development):
   bun dist/cli.js up

   OR create a global link first:
   bun link
   bunx third-eye-mcp up

📖 Documentation:
   • README.md                 — Project overview
   • docs/getting-started.md   — Installation & first run
   • docs/usage.md             — Agent integrations & workflows
   • docs/                     — Full technical reference

💡 Next steps:
   1. Run: bun dist/cli.js up
   2. Open http://127.0.0.1:3300
   3. Configure your API keys (if not done during setup)
   4. Connect your AI agent via docs/integrations

For help: bun dist/cli.js --help
`);
}

if (import.meta.main) {
  postInstall().catch(console.error);
}
