# Third Eye MCP - Local-First AI Overseer

**Professional AI validation system that monitors and approves agent outputs through a multi-stage pipeline.**

Third Eye MCP acts as an Overseer for AI agents (Claude, ChatGPT, Cursor, etc.), validating their work through 8 specialized "Eyes" that check ambiguity, intent, planning, implementation, tests, documentation, citations, and consistency.

## 🎯 Key Features

- **Zero Hallucinations**: Every output validated through multi-stage checks  
- **8 Specialized Eyes**: From ambiguity detection to final approval
- **Real-Time Monitoring**: Live dashboard showing pipeline execution
- **Local-First**: BYO API keys, your data stays private
- **MCP Protocol**: Works with Claude Desktop, Cursor, and other MCP hosts
- **Production Ready**: No stubs, no placeholders, fully implemented validation logic

## 📋 Prerequisites

- **Bun** v1.0+ (JavaScript runtime)
- **Node.js** v18+ (for Next.js UI)
- **Git** (for cloning)

## 🚀 Quick Start

### 1. Clone & Install

\`\`\`bash
git clone <repository-url> third-eye-mcp
cd third-eye-mcp
bun install
\`\`\`

### 2. Start Backend Server

\`\`\`bash
cd apps/server
bun run dev
\`\`\`

Server runs on \`http://localhost:7070\`

### 3. Start UI Portal (separate terminal)

\`\`\`bash
cd apps/ui  
bun run dev
\`\`\`

Portal opens at \`http://localhost:3300\`

### 4. Build MCP Bridge

\`\`\`bash
cd mcp-bridge
bun run build
\`\`\`

### 5. Configure Claude Desktop

Add to \`~/Library/Application Support/Claude/claude_desktop_config.json\`:

\`\`\`json
{
  "mcpServers": {
    "third-eye": {
      "command": "node",
      "args": ["/absolute/path/to/third-eye-mcp/mcp-bridge/build/index.js"]
    }
  }
}
\`\`\`

Restart Claude Desktop.

## 🧪 Testing the System

### Test Backend Eyes Directly

\`\`\`bash
# Test Sharingan (ambiguity detection)
curl -X POST http://localhost:7070/eyes/sharingan/clarify \\
  -H "Content-Type: application/json" \\
  -d '{
    "payload": { "prompt": "make it better" },
    "context": { "session_id": "test-123", "lang": "auto", "budget_tokens": 0 }
  }'
\`\`\`

## 📦 Project Structure

All Eyes implement real validation logic - no placeholders or stubs.

