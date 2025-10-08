#!/usr/bin/env bun

import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';

async function postInstall() {
  console.log('\n🧿 Third Eye MCP - Post-install setup\n');

  const thirdEyeDir = resolve(homedir(), '.third-eye-mcp');

  if (!existsSync(thirdEyeDir)) {
    console.log('📁 Creating ~/.third-eye-mcp directory...');
    mkdirSync(thirdEyeDir, { recursive: true });
    console.log('   ✓ Directory created');
  } else {
    console.log('   ✓ Directory exists');
  }

  const dbPath = resolve(thirdEyeDir, 'mcp.db');
  if (!existsSync(dbPath)) {
    console.log('🗄️  Initializing database...');
    try {
      const { execSync } = await import('child_process');
      execSync('bun run db:migrate', { stdio: 'inherit' });
      console.log('   ✓ Database initialized');
    } catch (error) {
      console.log('   ⚠ Database will be created on first run');
    }
  }

  console.log(`
✅ Third Eye MCP installed successfully!

🚀 Quick Start:
   bunx third-eye-mcp up

📖 Documentation:
   • README.md                 — Project overview
   • docs/getting-started.md   — Installation & first run
   • docs/usage.md             — Agent integrations & workflows
   • docs/                     — Full technical reference

💡 Next steps:
   1. Run: bunx third-eye-mcp up
   2. Open http://127.0.0.1:3300
   3. Configure your API keys
   4. Connect your AI agent via docs/integrations

For help: bunx third-eye-mcp --help
`);
}

if (import.meta.main) {
  postInstall().catch(console.error);
}
