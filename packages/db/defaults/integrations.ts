import type { NewMcpIntegration } from '../schema';
import { CLI_BIN, CLI_EXEC } from '@third-eye/types';

export type IntegrationSeed = Omit<NewMcpIntegration, 'id' | 'createdAt' | 'updatedAt'> & {
  slug: string;
};

export const DEFAULT_INTEGRATIONS: IntegrationSeed[] = [
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
    configTemplate: `claude mcp add third-eye -- ${CLI_EXEC} server`,
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
      "command": "bunx",
      "args": ["${CLI_BIN}", "server"]
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
    configTemplate: `Command: bunx
Arguments: ${CLI_BIN} server
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
      "command": "bunx",
      "args": ["${CLI_BIN}", "server"]
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
    logoUrl: 'https://raw.githubusercontent.com/continuedev/continue/main/images/icon.png',
    description: 'Continue extension adds AI pair programming with MCP tool support.',
    status: 'community',
    platforms: ['macos', 'windows', 'linux'],
    configType: 'json',
    configFiles: [
      { platform: 'all', path: '<workspace>/.continue/config.json' },
    ],
    configTemplate: `{
  "mcpServers": {
    "third-eye": {
      "command": "bunx",
      "args": ["${CLI_BIN}", "server"],
      "environment": {}
    }
  }
}`,
    setupSteps: [
      {
        title: 'Install Continue Extension',
        description: 'Install Continue extension from VS Code marketplace',
        code: null,
      },
      {
        title: 'Open Continue Settings',
        description: 'Press Cmd/Ctrl+Shift+P → Continue: Open Config',
        code: null,
      },
      {
        title: 'Add MCP Server',
        description: 'Insert the configuration below into config.json',
        code: 'config',
      },
      {
        title: 'Restart VS Code',
        description: 'Reload window to activate MCP server',
        code: null,
      },
    ],
    docsUrl: 'https://docs.continue.dev/reference/model-context-protocol',
    enabled: true,
    displayOrder: 5,
  },
  {
    name: 'VS Code (Cline)',
    slug: 'vscode-cline',
    logoUrl: 'https://github.com/cline/cline/raw/main/assets/icon.png',
    description: 'Cline extension integrates MCP servers for agent workflows in VS Code.',
    status: 'community',
    platforms: ['macos', 'windows', 'linux'],
    configType: 'json',
    configFiles: [
      { platform: 'all', path: '<workspace>/.cline/config.json' },
    ],
    configTemplate: `{
  "mcpServers": {
    "third-eye": {
      "command": "bunx",
      "args": ["${CLI_BIN}", "server"],
      "environment": {}
    }
  }
}`,
    setupSteps: [
      {
        title: 'Install Cline',
        description: 'Install Cline extension from VS Code marketplace',
        code: null,
      },
      {
        title: 'Open Cline Settings',
        description: 'Press Cmd/Ctrl+Shift+P → Cline: Open Config',
        code: null,
      },
      {
        title: 'Add MCP Server',
        description: 'Insert the configuration below into config.json',
        code: 'config',
      },
      {
        title: 'Reload VS Code',
        description: 'Reload window to activate MCP server',
        code: null,
      },
    ],
    docsUrl: 'https://github.com/cline/cline/blob/main/docs/mcp.md',
    enabled: true,
    displayOrder: 6,
  },
  {
    name: 'OpenAI ChatGPT (Actions)',
    slug: 'chatgpt-actions',
    logoUrl: 'https://openai.com/favicon.ico',
    description: 'Use Third Eye MCP via OpenAI Custom Actions (Beta).',
    status: 'experimental',
    platforms: ['macos', 'windows', 'linux'],
    configType: 'json',
    configFiles: [
      { platform: 'all', path: 'ChatGPT → Settings → Actions → Manage Actions' },
    ],
    configTemplate: `URL: http://{{MCP_PATH}}/mcp-bridge
Requires Auth: No
`,
    setupSteps: [
      {
        title: 'Open ChatGPT Settings',
        description: 'Navigate to Settings → Actions',
        code: null,
      },
      {
        title: 'Add New Action',
        description: 'Click "Create action" and provide server details',
        code: 'config',
      },
      {
        title: 'Approve Access',
        description: 'Allow ChatGPT to access the MCP endpoint',
        code: null,
      },
    ],
    docsUrl: 'https://platform.openai.com/docs/actions',
    enabled: true,
    displayOrder: 7,
  },
  {
    name: 'Gemini CLI',
    slug: 'gemini-cli',
    logoUrl: 'https://ai.google/static/images/icons/favicon-32x32.png',
    description: 'Use Third Eye MCP with Gemini CLI (custom tool integration).',
    status: 'community',
    platforms: ['macos', 'windows', 'linux'],
    configType: 'json',
    configFiles: [
      { platform: 'all', path: '~/.gemini/tools.json' },
    ],
    configTemplate: `{
  "tools": {
    "third-eye": {
      "command": "bunx",
      "args": ["${CLI_BIN}", "server"],
      "transport": "stdio"
    }
  }
}`,
    setupSteps: [
      {
        title: 'Install Gemini CLI',
        description: 'Follow Google AI Gemini CLI installation docs',
        code: null,
      },
      {
        title: 'Configure Tools',
        description: 'Create or edit ~/.gemini/tools.json',
        code: 'config',
      },
      {
        title: 'Restart CLI',
        description: 'Restart Gemini CLI session',
        code: null,
      },
    ],
    docsUrl: 'https://ai.google.dev/gemini-api/docs/tools',
    enabled: true,
    displayOrder: 8,
  },
  {
    name: 'OpenCode CLI',
    slug: 'opencode-cli',
    logoUrl: 'https://raw.githubusercontent.com/OpenCode-ai/.github/main/profile/logo.png',
    description: 'Terminal-first AI assistant with MCP support.',
    status: 'community',
    platforms: ['macos', 'linux'],
    configType: 'json',
    configFiles: [
      { platform: 'all', path: '~/.opencode/mcp.json' },
    ],
    configTemplate: `{
  "servers": {
    "third-eye": {
      "command": "bunx",
      "args": ["${CLI_BIN}", "server"],
      "transport": "stdio"
    }
  }
}`,
    setupSteps: [
      {
        title: 'Install OpenCode CLI',
        description: 'Follow OpenCode installation instructions',
        code: null,
      },
      {
        title: 'Configure MCP Server',
        description: 'Create ~/.opencode/mcp.json with the configuration below',
        code: 'config',
      },
      {
        title: 'Restart CLI',
        description: 'Restart the CLI to load the MCP server',
        code: null,
      },
    ],
    docsUrl: 'https://github.com/OpenCode-ai/opencode',
    enabled: true,
    displayOrder: 9,
  },
];
