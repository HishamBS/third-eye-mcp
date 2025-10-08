# Continue.dev Integration Guide

Connect Third Eye MCP to Continue.dev, the open-source AI coding assistant for VS Code and JetBrains.

## Prerequisites

- VS Code or JetBrains IDE installed
- Continue.dev extension installed ([VS Code](https://marketplace.visualstudio.com/items?itemName=Continue.continue), [JetBrains](https://plugins.jetbrains.com/plugin/22707-continue))
- Third Eye MCP installed (`bunx third-eye-mcp up`)
- API keys for Groq and/or OpenRouter

## Installation

### Step 1: Install Continue Extension

**VS Code**:
1. Open Extensions (Cmd+Shift+X / Ctrl+Shift+X)
2. Search "Continue"
3. Click Install
4. Reload VS Code

**JetBrains**:
1. Settings → Plugins
2. Search "Continue"
3. Click Install
4. Restart IDE

### Step 2: Locate Config File

Continue config location:

- **VS Code (All OS)**: `~/.continue/config.json`
- **JetBrains (All OS)**: `~/.continue/config.json`

If it doesn't exist, create it:

```bash
mkdir -p ~/.continue
touch ~/.continue/config.json
```

### Step 3: Configure MCP Server

Edit `~/.continue/config.json`:

```bash
# Open in editor
code ~/.continue/config.json  # VS Code
# or
nano ~/.continue/config.json  # Terminal
```

Add Third Eye MCP configuration:

```json
{
  "models": [
    {
      "title": "Claude 3.5 Sonnet",
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "your-anthropic-key"
    }
  ],
  "mcpServers": {
    "third-eye-mcp": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "GROQ_API_KEY": "gsk_your_groq_key_here",
        "OPENROUTER_API_KEY": "sk-or-v1-your_openrouter_key_here"
      }
    }
  }
}
```

### Step 4: Configure API Keys

Replace placeholder keys:

1. **Groq**: Get from [console.groq.com/keys](https://console.groq.com/keys)
2. **OpenRouter**: Get from [openrouter.ai/keys](https://openrouter.ai/keys)

**Local-only setup:**

```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"]
    }
  }
}
```

Third Eye will auto-detect Ollama/LM Studio.

### Step 5: Restart Continue

**VS Code**:
- Command Palette → "Continue: Reload"
- Or restart VS Code

**JetBrains**:
- File → Invalidate Caches / Restart

## Verification

### Check MCP Status

1. Open Continue panel (VS Code: sidebar, JetBrains: right panel)
2. Look for "MCP Servers" section
3. Verify `third-eye-mcp` is listed and connected

### Test Connection

In Continue chat:

```
Use the third_eye_overseer tool to test the connection.
```

Expected:
- Tool call to `overseer`
- Response from Third Eye
- Session visible at http://127.0.0.1:3300

## Usage Examples

### Code Review

Select code in editor, then in Continue:

```
Use the overseer tool to review this code for bugs and improvements.
```

### Generate Tests

```
Use the overseer tool to generate comprehensive unit tests for this function.
```

### Documentation

```
Use the overseer tool to generate detailed documentation for this module.
```

### Refactoring

```
Use the overseer tool to suggest refactoring improvements for better code quality.
```

### Debug Analysis

```
Use the overseer tool to analyze this error and suggest fixes:

[paste error]
```

## Continue-Specific Features

### Inline Edit with Third Eye

1. Select code
2. Cmd+I (Ctrl+I) for inline edit
3. Request: "Use overseer to improve this code"

### Context Menu Integration

Right-click in editor:
- "Continue: Ask About This Code"
- Then: "Use overseer tool to analyze"

### Slash Commands

Continue supports slash commands. Create custom ones:

```
/review - Use overseer to review selected code
/test - Use overseer to generate tests
/docs - Use overseer to generate documentation
```

Add to `config.json`:

```json
{
  "slashCommands": [
    {
      "name": "review",
      "description": "Review code with Third Eye",
      "prompt": "Use the third_eye_overseer tool to review the selected code for: 1) Bugs, 2) Performance issues, 3) Security vulnerabilities, 4) Code style"
    },
    {
      "name": "test",
      "description": "Generate tests with Third Eye",
      "prompt": "Use the third_eye_overseer tool to generate comprehensive unit tests with edge cases"
    },
    {
      "name": "docs",
      "description": "Generate docs with Third Eye",
      "prompt": "Use the third_eye_overseer tool to generate detailed documentation including usage examples"
    }
  ]
}
```

### Autocomplete with Context

Continue can use Third Eye for context-aware autocomplete:

```json
{
  "tabAutocompleteOptions": {
    "useMcp": true,
    "mcpServers": ["third-eye-mcp"]
  }
}
```

## Troubleshooting

### MCP Server Not Found

1. **Check config file syntax**:
   ```bash
   cat ~/.continue/config.json | jq .
   ```

2. **Verify Third Eye is installed**:
   ```bash
   bunx third-eye-mcp --version
   ```

3. **Check Continue logs**:
   - VS Code: Output panel → Continue
   - JetBrains: Help → Show Log

4. **Test MCP server manually**:
   ```bash
   bunx third-eye-mcp server
   ```

### Connection Failed

1. **Start Third Eye services**:
   ```bash
   bunx third-eye-mcp up --verbose
   ```

2. **Check port availability**:
   ```bash
   lsof -i :7070  # MCP server
   lsof -i :3300  # Dashboard
   ```

3. **Review Third Eye logs**:
   ```bash
   bunx third-eye-mcp logs --tail
   ```

### Slow Performance

1. **Use faster models**:
   - Dashboard → Models & Routing
   - Set Overseer to `llama-3.1-8b-instant`

2. **Enable caching**:
   ```json
   {
     "mcpServers": {
       "third-eye-mcp": {
         "command": "bunx",
         "args": ["third-eye-mcp", "server"],
         "cache": true
       }
     }
   }
   ```

3. **Use local models**:
   ```bash
   ollama pull llama3.2
   ```

### Tool Errors

1. **Check provider status**:
   - Dashboard → Settings → Provider Keys
   - Verify green indicators

2. **Review error in dashboard**:
   - Dashboard → Monitor tab
   - Check Eye execution logs

3. **Test providers**:
   ```bash
   curl https://api.groq.com/openai/v1/models \
     -H "Authorization: Bearer $GROQ_API_KEY"
   ```

## Advanced Configuration

### Per-Project Config

Create `.continue/config.json` in project root:

```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "MCP_DB": "${workspaceFolder}/.third-eye/mcp.db",
        "GROQ_API_KEY": "gsk_project_key"
      }
    }
  }
}
```

### Multiple Third Eye Instances

```json
{
  "mcpServers": {
    "third-eye-dev": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "MCP_DB": "~/.third-eye-dev/mcp.db",
        "MCP_PORT": "7070",
        "GROQ_API_KEY": "gsk_dev_key"
      }
    },
    "third-eye-prod": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "MCP_DB": "~/.third-eye-prod/mcp.db",
        "MCP_PORT": "7071",
        "GROQ_API_KEY": "gsk_prod_key"
      }
    }
  }
}
```

### Debug Mode

```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "DEBUG": "third-eye:*",
        "LOG_LEVEL": "debug",
        "GROQ_API_KEY": "gsk_xxx"
      }
    }
  }
}
```

### Custom Strictness

```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "THIRD_EYE_STRICTNESS": "8",
        "GROQ_API_KEY": "gsk_xxx"
      }
    }
  }
}
```

## Workflow Examples

### 1. TDD Workflow

```
Step 1: Write failing test
Step 2: "Use /test to validate test coverage"
Step 3: Implement feature
Step 4: "Use /review to check implementation"
Step 5: Run tests
```

### 2. Feature Development

```
Step 1: "/docs requirements" - Document requirements
Step 2: Implement feature
Step 3: "/review" - Review implementation
Step 4: "/test" - Generate tests
Step 5: "/docs" - Update documentation
```

### 3. Refactoring

```
Step 1: Identify code smell
Step 2: "Use overseer to analyze and suggest refactoring"
Step 3: Apply changes
Step 4: "/review" - Verify improvements
Step 5: "/test" - Ensure tests pass
```

### 4. Bug Fixing

```
Step 1: Reproduce bug
Step 2: "Use overseer to analyze root cause"
Step 3: Implement fix
Step 4: "/review" - Verify fix
Step 5: "/test" - Add regression test
```

## Continue + Third Eye Best Practices

1. **Use slash commands**: Create shortcuts for common Third Eye operations
2. **Enable autocomplete**: Let Third Eye enhance suggestions
3. **Monitor dashboard**: Keep http://127.0.0.1:3300 open
4. **Review sessions**: Use Replay tab for audit trail
5. **Optimize routing**: Fast models for autocomplete, Claude for reviews
6. **Version personas**: Customize Eyes per project

## Integration with Continue Features

### Continue Context + Third Eye

Continue provides rich context to Third Eye:
- Open files
- Git history
- Workspace structure
- Recent edits

### Continue Actions + Third Eye

Create custom actions:

```json
{
  "customCommands": [
    {
      "name": "Review PR",
      "prompt": "Use overseer to review all changes in this PR for: security, performance, maintainability"
    },
    {
      "name": "Generate Docs",
      "prompt": "Use overseer to generate comprehensive documentation for all public APIs"
    }
  ]
}
```

### Continue Terminal + Third Eye

Run Third Eye commands:

```bash
# Start Third Eye
bunx third-eye-mcp up

# Monitor
bunx third-eye-mcp status

# View logs
bunx third-eye-mcp logs --tail
```

## Keyboard Shortcuts

Add to VS Code `keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+r",
    "command": "continue.sendMessage",
    "args": "Use overseer tool to review selected code"
  },
  {
    "key": "ctrl+shift+t",
    "command": "continue.sendMessage",
    "args": "Use overseer tool to generate tests"
  },
  {
    "key": "ctrl+shift+d",
    "command": "continue.sendMessage",
    "args": "Use overseer tool to generate documentation"
  }
]
```

## Support

- Dashboard: http://127.0.0.1:3300
- Health check: `bun run health:full`
- Logs: `bunx third-eye-mcp logs`
- Continue docs: [continue.dev/docs](https://continue.dev/docs)
- Issues: [GitHub Issues](https://github.com/HishamBS/third-eye-mcp/issues)
