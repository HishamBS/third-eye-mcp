import { useState } from 'react';

interface AgentGuide {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  snippet: string;
  dockerHint?: string;
}

const AGENT_GUIDES: AgentGuide[] = [
  {
    id: 'codex-cli',
    name: 'Codex CLI',
    description:
      'Update Codex CLI user config so the Third Eye bridge is available in `/tools`. Codex reads the `~/.codex/config.toml` MCP table on launch.',
    docsUrl: 'https://developers.openai.com/codex/cli',
    snippet: `[mcp_servers.third-eye]\ncommand = "bun"\nargs = ["run", "--cwd", "<repo>/mcp-bridge", "start"]\nenv = { }`,
    dockerHint:
      'Docker alternative → command: /bin/bash, args: ["-lc", "cd <repo> && docker compose run --rm mcp-bridge" ]',
  },
  {
    id: 'claude-suite',
    name: 'Claude Code & Desktop',
    description:
      'Register the bridge with Anthropic’s CLI once; both Claude Code and Claude Desktop read the shared MCP registry after you approve the trust prompt.',
    docsUrl: 'https://docs.anthropic.com/en/docs/build-with-claude/claude-desktop/model-context-protocol',
    snippet: 'claude mcp add third-eye -- bun run --cwd "<repo>/mcp-bridge" start',
    dockerHint:
      'Docker workflow → claude mcp add third-eye -- /bin/bash -lc "cd <repo> && docker compose run --rm mcp-bridge". In Claude Desktop toggle the server on via Settings → Tools.',
  },
  {
    id: 'chatgpt-web',
    name: 'ChatGPT Web',
    description:
      'Beta GPTs support local MCP servers via the OpenAI CLI `tools` registry. Run this, then enable under ChatGPT → GPTs → Build → Tools → Your MCP Servers.',
    docsUrl: 'https://platform.openai.com/docs/assistants/tools/model-context-protocol',
    snippet:
      'openai tools add third-eye --command bun \\\n+  --args run --args --cwd --args "<repo>/mcp-bridge" --args start',
    dockerHint:
      'Docker: openai tools add third-eye --command /bin/bash --args -lc --args "cd <repo> && docker compose run --rm mcp-bridge"',
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    description:
      'Gemini CLI watches `~/.gemini/settings.json`. Merge this block and restart `gemini chat`.',
    docsUrl: 'https://ai.google.dev/gemini-cli/docs',
    snippet:
      '{\n  "mcpServers": {\n    "third-eye": {\n      "command": "bun",\n      "args": ["run", "--cwd", "<repo>/mcp-bridge", "start"],\n      "env": {}\n    }\n  }\n}',
    dockerHint:
      'For Docker set "command": "/bin/bash" and "args": ["-lc", "cd <repo> && docker compose run --rm mcp-bridge"].',
  },
  {
    id: 'vscode',
    name: 'VS Code (Copilot MCP)',
    description:
      'Copilot Chat ≥ 1.102 adds “MCP: Open User Configuration”. Paste this JSON under `servers`.',
    docsUrl: 'https://code.visualstudio.com/docs/copilot/mcp',
    snippet:
      '{\n  "servers": {\n    "third-eye": {\n      "type": "stdio",\n      "command": "bun",\n      "args": ["run", "--cwd", "<repo>/mcp-bridge", "start"],\n      "env": {}\n    }\n  }\n}',
    dockerHint: 'Swap command/args as with other tools if you prefer Docker.',
  },
  {
    id: 'warp',
    name: 'Warp.dev',
    description:
      'Warp AI → Settings → Model Context Protocol → Add CLI server. Use these values.',
    docsUrl: 'https://docs.warp.dev/features/ai/model-context-protocol',
    snippet:
      'Command: bun\nArgs: run --cwd "<repo>/mcp-bridge" start',
    dockerHint: 'Docker: Command /bin/bash, Args -lc "cd <repo> && docker compose run --rm mcp-bridge"',
  },
  {
    id: 'zed',
    name: 'Zed AI',
    description:
      'Zed → Settings → JSON. Add a `context_servers.third-eye` entry and restart MCP servers from the command palette.',
    docsUrl: 'https://zed.dev/docs/ai/model-context-protocol',
    snippet:
      '{\n  "context_servers": {\n    "third-eye": {\n      "source": "custom",\n      "command": "bun",\n      "args": ["run", "--cwd", "<repo>/mcp-bridge", "start"],\n      "env": {}\n    }\n  }\n}',
    dockerHint: 'Docker fallback identical to other JSON snippets.',
  },
  {
    id: 'opencode',
    name: 'OpenCode CLI',
    description:
      'OpenCode ships as an MCP server. Pair it with Third Eye inside Claude/Cursor/etc. This sample wires both servers to Claude Code.',
    docsUrl: 'https://github.com/openai/opencode',
    snippet:
      'npm install -g opencode\nclaude mcp add opencode -- npx -y opencode-mcp-tool -- --model gemma2-9b-it\nclaude mcp add third-eye -- bun run --cwd "<repo>/mcp-bridge" start',
    dockerHint: 'Run the final command with Docker if needed as shown in other entries.',
  },
  {
    id: 'cursor',
    name: 'Cursor IDE',
    description:
      'Cursor → Settings → MCP. Choose “Add CLI Server” and populate command + args with the bridge launcher.',
    docsUrl: 'https://docs.cursor.com/using-cursor/model-context-protocol',
    snippet:
      'Command: bun\nArgs: run --cwd "<repo>/mcp-bridge" start',
    dockerHint: 'Docker: Command /bin/bash, Args -lc "cd <repo> && docker compose run --rm mcp-bridge"',
  },
];

export function AgentConnectionPage() {
  const [openId, setOpenId] = useState<string | null>(AGENT_GUIDES[0]?.id ?? null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy snippet', error);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-10 text-sm text-slate-200">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Integrations</p>
        <h1 className="text-3xl font-semibold text-white">Agent Connection Playbook</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          Connect the Third Eye MCP bridge to your favourite tools. Each collapsible bundles the official documentation link, the exact command or config snippet, and Docker-friendly alternatives.
        </p>
        <p className="text-xs text-slate-500">Always start services with `./start.sh start` before registering the bridge.</p>
      </header>

      <div className="space-y-4">
        {AGENT_GUIDES.map((guide) => {
          const isOpen = openId === guide.id;
          return (
            <section key={guide.id} className="rounded-2xl border border-brand-outline/40 bg-brand-paper/80 shadow-glass">
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : guide.id)}
                className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left text-sm text-white transition hover:bg-brand-paperElev/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/50"
              >
                <div>
                  <h2 className="text-lg font-semibold text-white">{guide.name}</h2>
                  <p className="text-xs text-slate-400">{guide.description}</p>
                </div>
                <span className="text-xs text-slate-400">{isOpen ? '▲' : '▼'}</span>
              </button>
              {isOpen && (
                <div className="space-y-4 border-t border-brand-outline/30 px-6 py-4 text-xs text-slate-300">
                  <p>
                    Reference: <a className="underline decoration-dotted underline-offset-4" href={guide.docsUrl} target="_blank" rel="noreferrer">{guide.docsUrl}</a>
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Snippet</label>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={guide.snippet}
                        className="h-36 w-full resize-none rounded-xl border border-brand-outline/40 bg-brand-paper/90 p-3 font-mono text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopy(guide.snippet, guide.id)}
                        className="absolute right-3 top-3 rounded-full border border-brand-outline/40 px-3 py-1 text-[11px] font-medium text-brand-accent transition hover:border-brand-accent hover:bg-brand-accent/10"
                      >
                        {copiedId === guide.id ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  {guide.dockerHint && <p className="text-[11px] text-slate-500">{guide.dockerHint}</p>}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default AgentConnectionPage;
