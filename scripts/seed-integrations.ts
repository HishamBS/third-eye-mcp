#!/usr/bin/env bun

import { getDb, mcpIntegrations, type NewMcpIntegration } from '../packages/db/index';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

/**
 * Seed MCP Integrations
 *
 * Creates default integration configs for 9 major AI tools
 */

const { db } = getDb();

const defaultIntegrations: Omit<NewMcpIntegration, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Claude Code & Desktop',
    slug: 'claude-suite',
    logoUrl: 'https://www.anthropic.com/images/icons/claude-app-icon.png',
    description: 'Register the bridge with Anthropic CLI once; both Claude Code and Claude Desktop read the shared MCP registry after you approve the trust prompt',
    status: 'official',
    platforms: ['macos', 'windows', 'linux'],
    configType: 'json',
    configFiles: [
      { platform: 'all', path: 'CLI command (see below)' },
    ],
    configTemplate: `claude mcp add third-eye -- bun run --cwd "{{MCP_PATH}}/mcp-bridge" start`,
    setupSteps: [
      {
        title: 'Run CLI Command',
        description: 'Execute the command below to register Third Eye with Claude',
        code: 'config',
      },
      {
        title: 'Approve Trust Prompt',
        description: 'Approve the trust prompt when Claude Code or Desktop starts',
        code: null,
      },
      {
        title: 'Toggle Server On (Desktop)',
        description: 'In Claude Desktop, go to Settings → Tools and toggle the server on',
        code: null,
      },
      {
        title: 'Verify Connection',
        description: 'Look for the hammer/tools icon confirming MCP server is active',
        code: null,
      },
    ],
    docsUrl: 'https://docs.anthropic.com/en/docs/build-with-claude/claude-desktop/model-context-protocol',
    enabled: true,
    displayOrder: 1,
  },
  {
    name: 'Cursor IDE',
    slug: 'cursor',
    logoUrl: 'https://cursor.sh/brand/icon.png',
    description: 'AI-first code editor with native MCP integration. Supports global and project-specific configs.',
    status: 'official',
    platforms: ['macos', 'windows', 'linux'],
    configType: 'json',
    configFiles: [
      { platform: 'macos', path: '~/.cursor/mcp.json' },
      { platform: 'windows', path: '%USERPROFILE%\\.cursor\\mcp.json' },
      { platform: 'linux', path: '~/.cursor/mcp.json' },
    ],
    configTemplate: `{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "bun",
      "args": ["run", "{{MCP_BIN}}"]
    }
  }
}`,
    setupSteps: [
      {
        title: 'Open Cursor Settings',
        description: 'Go to Settings → Cursor Settings → MCP',
        code: null,
      },
      {
        title: 'Add Global MCP Server',
        description: 'Click "Add new global MCP server" or create ~/.cursor/mcp.json',
        code: null,
      },
      {
        title: 'Paste Configuration',
        description: 'Add the configuration below to mcp.json',
        code: 'config',
      },
      {
        title: 'Restart Cursor',
        description: 'Restart Cursor IDE to load the MCP server',
        code: null,
      },
      {
        title: 'Verify in Agent Mode',
        description: 'Switch to Agent Mode (not Ask Mode) to access MCP tools',
        code: null,
      },
    ],
    docsUrl: 'https://docs.cursor.com/context/model-context-protocol',
    enabled: true,
    displayOrder: 2,
  },
  {
    name: 'Warp Terminal',
    slug: 'warp',
    logoUrl: 'https://www.warp.dev/images/warp-icon.png',
    description: 'Modern terminal with AI and experimental MCP support. Add servers via UI or startup commands.',
    status: 'experimental',
    platforms: ['macos', 'linux'],
    configType: 'json',
    configFiles: [
      { platform: 'macos', path: 'Warp Settings → MCP → + Add Server' },
      { platform: 'linux', path: 'Warp Settings → MCP → + Add Server' },
    ],
    configTemplate: `Command: bun
Arguments: run {{MCP_BIN}}
Type: stdio`,
    setupSteps: [
      {
        title: 'Open Warp Settings',
        description: 'Click Warp menu → Settings',
        code: null,
      },
      {
        title: 'Navigate to MCP Section',
        description: 'Find the MCP or Model Context Protocol section in settings',
        code: null,
      },
      {
        title: 'Add New Server',
        description: 'Click "+ Add" button and provide startup command',
        code: 'config',
      },
      {
        title: 'Enable Server',
        description: 'Toggle the server to enabled state',
        code: null,
      },
      {
        title: 'Test in AI Mode',
        description: 'Use Warp AI and check if Third Eye tools are available',
        code: null,
      },
    ],
    docsUrl: 'https://docs.warp.dev/features/warp-ai/mcp',
    enabled: true,
    displayOrder: 3,
  },
  {
    name: 'Zed Editor',
    slug: 'zed',
    logoUrl: 'https://zed.dev/img/logo.png',
    description: 'High-performance editor with MCP support via extensions or settings.json configuration.',
    status: 'official',
    platforms: ['macos', 'linux'],
    configType: 'json',
    configFiles: [
      { platform: 'macos', path: '~/Library/Application Support/Zed/settings.json' },
      { platform: 'linux', path: '~/.config/zed/settings.json' },
    ],
    configTemplate: `{
  "context_servers": {
    "third-eye-mcp": {
      "command": "bun",
      "args": ["run", "{{MCP_BIN}}"]
    }
  }
}`,
    setupSteps: [
      {
        title: 'Open Assistant Settings',
        description: 'Click the Assistant (✨) icon → Settings',
        code: null,
      },
      {
        title: 'Add Context Server',
        description: 'In Context Servers section, click "+ Add Context Server"',
        code: null,
      },
      {
        title: 'Configure Server',
        description: 'Add the configuration to settings.json',
        code: 'config',
      },
      {
        title: 'Verify Server Status',
        description: 'Check that the indicator dot is green (server is active)',
        code: null,
      },
    ],
    docsUrl: 'https://zed.dev/docs/ai/mcp',
    enabled: true,
    displayOrder: 4,
  },
  {
    name: 'VS Code (Continue)',
    slug: 'vscode-continue',
    logoUrl: 'https://continue.dev/docs/assets/images/continue-logo-square-c428a93e5060f3f3e5d05c7fc1b70c97.png',
    description: 'Continue extension for VS Code with MCP server support. Configure via YAML in workspace.',
    status: 'official',
    platforms: ['macos', 'windows', 'linux'],
    configType: 'yaml',
    configFiles: [
      { platform: 'all', path: '.continue/mcpServers/third-eye.yaml' },
    ],
    configTemplate: `name: third-eye-mcp
type: stdio
command: bun
args:
  - run
  - {{MCP_BIN}}`,
    setupSteps: [
      {
        title: 'Install Continue Extension',
        description: 'Install the Continue extension from VS Code marketplace',
        code: null,
      },
      {
        title: 'Create MCP Config Directory',
        description: 'Create .continue/mcpServers folder in your workspace root',
        code: 'mkdir -p .continue/mcpServers',
      },
      {
        title: 'Create YAML Config',
        description: 'Create third-eye.yaml with the configuration below',
        code: 'config',
      },
      {
        title: 'Reload VS Code',
        description: 'Reload VS Code window to load the MCP server',
        code: null,
      },
      {
        title: 'Use in Agent Mode',
        description: 'MCP tools are only available in Continue agent mode',
        code: null,
      },
    ],
    docsUrl: 'https://docs.continue.dev/customize/deep-dives/mcp',
    enabled: true,
    displayOrder: 5,
  },
  {
    name: 'ChatGPT Web (Custom Actions)',
    slug: 'chatgpt-web',
    logoUrl: 'https://cdn.oaistatic.com/_next/static/media/apple-touch-icon.59f2e898.png',
    description: 'ChatGPT web does not natively support MCP stdio. Requires HTTP wrapper or custom GPT actions.',
    status: 'community',
    platforms: ['web'],
    configType: 'json',
    configFiles: [
      { platform: 'web', path: 'Custom GPT Actions or API wrapper required' },
    ],
    configTemplate: `{
  "note": "ChatGPT web requires an HTTP API wrapper.",
  "options": [
    "Option 1: Use Zapier MCP connector",
    "Option 2: Deploy Third Eye MCP behind an HTTP gateway",
    "Option 3: Create Custom GPT with API actions"
  ],
  "api_base": "https://your-domain.com/api/mcp"
}`,
    setupSteps: [
      {
        title: 'Note: Not Native MCP Support',
        description: 'ChatGPT web does not support stdio MCP servers directly',
        code: null,
      },
      {
        title: 'Option 1: Use Zapier MCP',
        description: 'Connect via Zapier MCP connector (paid service)',
        code: null,
      },
      {
        title: 'Option 2: HTTP Gateway',
        description: 'Deploy Third Eye with an HTTP wrapper (ngrok, cloudflare tunnel)',
        code: null,
      },
      {
        title: 'Option 3: Custom GPT Actions',
        description: 'Create a Custom GPT and add Third Eye API as custom actions',
        code: null,
      },
    ],
    docsUrl: 'https://platform.openai.com/docs/mcp',
    enabled: true,
    displayOrder: 6,
  },
  {
    name: 'Codex CLI',
    slug: 'codex-cli',
    logoUrl: null,
    description: 'Update Codex CLI user config so the Third Eye bridge is available in /tools. Codex reads the ~/.codex/config.toml MCP table on launch',
    status: 'official',
    platforms: ['macos', 'windows', 'linux'],
    configType: 'json',
    configFiles: [
      { platform: 'all', path: '~/.codex/config.toml' },
    ],
    configTemplate: `[mcp_servers.third-eye]
command = "bun"
args = ["run", "--cwd", "{{MCP_PATH}}/mcp-bridge", "start"]
env = { }`,
    setupSteps: [
      {
        title: 'Open Codex Config',
        description: 'Edit ~/.codex/config.toml file',
        code: null,
      },
      {
        title: 'Add Third Eye Server',
        description: 'Add the configuration below to the file',
        code: 'config',
      },
      {
        title: 'Restart Codex CLI',
        description: 'Restart Codex CLI to load the MCP server',
        code: null,
      },
      {
        title: 'Verify in /tools',
        description: 'Check that Third Eye tools appear in /tools command',
        code: null,
      },
    ],
    docsUrl: 'https://developers.openai.com/codex/cli',
    enabled: true,
    displayOrder: 7,
  },
  {
    name: 'Gemini CLI',
    slug: 'gemini-cli',
    logoUrl: null,
    description: 'Gemini CLI watches ~/.gemini/settings.json. Merge this block and restart gemini chat',
    status: 'official',
    platforms: ['macos', 'windows', 'linux'],
    configType: 'json',
    configFiles: [
      { platform: 'all', path: '~/.gemini/settings.json' },
    ],
    configTemplate: `{
  "mcpServers": {
    "third-eye": {
      "command": "bun",
      "args": ["run", "--cwd", "{{MCP_PATH}}/mcp-bridge", "start"],
      "env": {}
    }
  }
}`,
    setupSteps: [
      {
        title: 'Open Gemini Settings',
        description: 'Edit ~/.gemini/settings.json file',
        code: null,
      },
      {
        title: 'Merge Configuration',
        description: 'Add the mcpServers block to your settings.json',
        code: 'config',
      },
      {
        title: 'Restart Gemini Chat',
        description: 'Restart gemini chat to load the MCP server',
        code: null,
      },
      {
        title: 'Verify Connection',
        description: 'Check that Third Eye tools are available in Gemini',
        code: null,
      },
    ],
    docsUrl: 'https://ai.google.dev/gemini-cli/docs',
    enabled: true,
    displayOrder: 8,
  },
  {
    name: 'OpenCode CLI',
    slug: 'opencode',
    logoUrl: null,
    description: 'OpenCode ships as an MCP server. Pair it with Third Eye inside Claude/Cursor/etc. This sample wires both servers to Claude Code',
    status: 'community',
    platforms: ['macos', 'windows', 'linux'],
    configType: 'json',
    configFiles: [
      { platform: 'all', path: 'CLI commands (see below)' },
    ],
    configTemplate: `npm install -g opencode
claude mcp add opencode -- npx -y opencode-mcp-tool -- --model gemma2-9b-it
claude mcp add third-eye -- bun run --cwd "{{MCP_PATH}}/mcp-bridge" start`,
    setupSteps: [
      {
        title: 'Install OpenCode',
        description: 'Install OpenCode globally via npm',
        code: 'npm install -g opencode',
      },
      {
        title: 'Register OpenCode Server',
        description: 'Add OpenCode to Claude MCP registry',
        code: 'claude mcp add opencode -- npx -y opencode-mcp-tool -- --model gemma2-9b-it',
      },
      {
        title: 'Register Third Eye Server',
        description: 'Add Third Eye to Claude MCP registry',
        code: 'claude mcp add third-eye -- bun run --cwd "{{MCP_PATH}}/mcp-bridge" start',
      },
      {
        title: 'Verify Both Servers',
        description: 'Check that both OpenCode and Third Eye tools are available',
        code: null,
      },
    ],
    docsUrl: 'https://github.com/openai/opencode',
    enabled: true,
    displayOrder: 9,
  },
];

async function seedIntegrations() {
  console.log('🌱 Seeding MCP integrations...\n');

  let created = 0;
  let skipped = 0;

  for (const integration of defaultIntegrations) {
    // Check if already exists
    const existing = await db.select()
      .from(mcpIntegrations)
      .where(eq(mcpIntegrations.slug, integration.slug))
      .limit(1);

    if (existing.length > 0) {
      console.log(`⏭️  ${integration.name} already exists, skipping...`);
      skipped++;
      continue;
    }

    const newIntegration: NewMcpIntegration = {
      ...integration,
      id: nanoid(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(mcpIntegrations).values(newIntegration);
    console.log(`✅ Created: ${integration.name}`);
    created++;
  }

  console.log(`\n🎉 Seeding complete!`);
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${defaultIntegrations.length}\n`);
}

// Run if executed directly
if (import.meta.main) {
  seedIntegrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedIntegrations };
