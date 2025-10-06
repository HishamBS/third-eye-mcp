#!/usr/bin/env bun

import { getDb, mcpIntegrations, type NewMcpIntegration } from '../packages/db/index';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';

/**
 * Seed MCP Integrations
 *
 * Creates default integration configs for 6 major AI tools
 */

const { db } = getDb();

const defaultIntegrations: Omit<NewMcpIntegration, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Claude Desktop',
    slug: 'claude-desktop',
    logoUrl: 'https://www.anthropic.com/images/icons/claude-app-icon.png',
    description: 'Official Anthropic Claude Desktop app with native MCP support via stdio transport',
    status: 'official',
    platforms: ['macos', 'windows'],
    configType: 'json',
    configFiles: [
      { platform: 'macos', path: '~/Library/Application Support/Claude/claude_desktop_config.json' },
      { platform: 'windows', path: '%APPDATA%\\Claude\\claude_desktop_config.json' },
    ],
    configTemplate: `{
  "mcpServers": {
    "third-eye-mcp": {
      "type": "stdio",
      "command": "bun",
      "args": ["run", "{{MCP_BIN}}"]
    }
  }
}`,
    setupSteps: [
      {
        title: 'Open Claude Desktop Settings',
        description: 'Click the Claude icon → Settings → Developer',
        code: null,
      },
      {
        title: 'Edit Configuration',
        description: 'Click "Edit Config" button to open claude_desktop_config.json',
        code: null,
      },
      {
        title: 'Add Third Eye MCP Server',
        description: 'Copy the configuration below and paste it into the file',
        code: 'config',
      },
      {
        title: 'Restart Claude Desktop',
        description: 'Close and reopen Claude Desktop to load the MCP server',
        code: null,
      },
      {
        title: 'Verify Connection',
        description: 'Look for the hammer/tools icon in the bottom-right corner of Claude Desktop',
        code: null,
      },
    ],
    docsUrl: 'https://modelcontextprotocol.io/clients#claude-desktop',
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
