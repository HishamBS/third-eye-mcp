# Cline Integration Guide

Connect Third Eye MCP to Cline (formerly Claude Dev) for enhanced AI coding assistance in VS Code.

## Prerequisites

- VS Code installed ([Download](https://code.visualstudio.com/))
- Cline extension installed ([VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev))
- Third Eye MCP installed (`bunx third-eye-mcp up` or global install)
- API keys for Groq and/or OpenRouter

## Installation

### Step 1: Install Cline Extension

1. Open VS Code
2. Go to Extensions (Cmd+Shift+X / Ctrl+Shift+X)
3. Search for "Cline" or "Claude Dev"
4. Click **Install**
5. Reload VS Code if prompted

### Step 2: Configure MCP Settings

Cline uses VS Code's settings for MCP configuration.

Open VS Code settings:
- **macOS**: Cmd+,
- **Windows/Linux**: Ctrl+,

Or edit `settings.json` directly:
- **macOS**: `~/Library/Application Support/Code/User/settings.json`
- **Linux**: `~/.config/Code/User/settings.json`
- **Windows**: `%APPDATA%\Code\User\settings.json`

### Step 3: Add Third Eye MCP Configuration

Add to your `settings.json`:

```json
{
  "cline.mcpServers": {
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

Replace placeholder keys with your actual keys:

1. **Groq API Key**: Get from [console.groq.com/keys](https://console.groq.com/keys)
2. **OpenRouter API Key**: Get from [openrouter.ai/keys](https://openrouter.ai/keys)

**Using local models only?**

```json
{
  "cline.mcpServers": {
    "third-eye-mcp": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"]
    }
  }
}
```

Third Eye will auto-detect Ollama/LM Studio.

### Step 5: Reload VS Code

1. Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
2. Run: "Developer: Reload Window"
3. Wait for Cline to initialize MCP servers

## Verification

### Check MCP Status

1. Open Cline sidebar (click Cline icon)
2. Look for MCP status indicator
3. Should show "third-eye-mcp: Connected"

### Test Connection

In Cline chat:

```
Use the third_eye_overseer tool to analyze this text: "Hello world"
```

Expected behavior:
- Cline calls `overseer` tool
- Third Eye processes request
- Dashboard shows session at http://127.0.0.1:3300
- Response appears in Cline chat

## Usage Examples

### Code Analysis

Select code in editor, then in Cline:

```
Use the overseer tool to analyze the selected code for potential issues.
```

### Generate Documentation

```
Use the overseer tool to generate comprehensive JSDoc comments for this function.
```

### Refactoring Suggestions

```
Use the overseer tool to suggest refactoring improvements for better maintainability.
```

### Test Generation

```
Use the overseer tool to generate unit tests for the selected function.
```

## Cline-Specific Features

### File Context Awareness

Cline automatically provides file context to Third Eye:

```
Use the overseer tool to review the architecture of the current file.
```

### Multi-File Operations

```
Use the overseer tool to analyze consistency across all TypeScript files in the src/ directory.
```

### Terminal Integration

Run Third Eye commands in VS Code terminal:

```bash
# Start Third Eye
bunx third-eye-mcp up

# Monitor status
bunx third-eye-mcp status

# View logs
bunx third-eye-mcp logs --tail
```

### Task Automation

Create VS Code tasks for Third Eye:

`.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Third Eye MCP",
      "type": "shell",
      "command": "third-eye-mcp up",
      "isBackground": true,
      "problemMatcher": []
    },
    {
      "label": "Stop Third Eye MCP",
      "type": "shell",
      "command": "third-eye-mcp stop"
    }
  ]
}
```

Run tasks: Cmd+Shift+P → "Tasks: Run Task"

## Troubleshooting

### MCP Server Not Connecting

1. **Check Cline logs**:
   - Command Palette → "Cline: Show Output Channel"
   - Look for MCP initialization errors

2. **Verify Third Eye is running**:
   ```bash
   bunx third-eye-mcp status
   ```

3. **Test MCP server manually**:
   ```bash
   bunx third-eye-mcp server
   # Should start without errors
   ```

4. **Check VS Code settings**:
   ```bash
   # View current settings
   cat ~/Library/Application\ Support/Code/User/settings.json | jq .
   ```

### Tool Not Available in Cline

1. **Restart VS Code completely**
2. **Check MCP settings syntax**:
   - Settings → Extensions → Cline
   - Verify JSON is valid

3. **Update Cline extension**:
   - Extensions → Cline → Update

4. **Check Cline MCP support**:
   - Ensure Cline version supports MCP
   - Minimum version: 1.0.0+

### Slow Performance

1. **Use faster models**:
   - Dashboard → Models & Routing
   - Assign `llama-3.1-8b-instant` to frequently-used Eyes

2. **Monitor execution**:
   - Dashboard → Monitor tab
   - Check Eye latency

3. **Enable local inference**:
   ```bash
   brew install ollama  # macOS
   ollama pull llama3.2
   ```

### Provider Errors

If API calls fail:

1. **Verify API keys**:
   ```bash
   # Check Groq
   curl https://api.groq.com/openai/v1/models \
     -H "Authorization: Bearer $GROQ_API_KEY"
   ```

2. **Check quota**:
   - Groq: [console.groq.com](https://console.groq.com)
   - OpenRouter: [openrouter.ai/account](https://openrouter.ai/account)

3. **Review fallback config**:
   - Dashboard → Models & Routing
   - Ensure fallback models set

## Advanced Configuration

### Workspace-Specific Settings

Create `.vscode/settings.json` in your project:

```json
{
  "cline.mcpServers": {
    "third-eye-mcp": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "MCP_DB": "${workspaceFolder}/.third-eye/mcp.db",
        "GROQ_API_KEY": "gsk_xxx"
      }
    }
  }
}
```

This keeps Third Eye data per-project.

### Debug Mode

Enable verbose logging:

```json
{
  "cline.mcpServers": {
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

### Custom Ports

If ports conflict:

```json
{
  "cline.mcpServers": {
    "third-eye-mcp": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "MCP_PORT": "8080",
        "MCP_UI_PORT": "4000",
        "GROQ_API_KEY": "gsk_xxx"
      }
    }
  }
}
```

## Workflow Examples

### 1. Feature Development

```
Step 1: "Use overseer to analyze requirements for user authentication"
Step 2: Code implementation
Step 3: "Use overseer to review implementation for security issues"
Step 4: "Use overseer to generate tests"
Step 5: Run tests
```

### 2. Code Review

```
Step 1: Open PR diff
Step 2: "Use overseer to review all changes in this PR"
Step 3: Review feedback in dashboard Evidence tab
Step 4: Address issues
Step 5: "Use overseer to verify fixes"
```

### 3. Refactoring

```
Step 1: Identify code smell
Step 2: "Use overseer to suggest refactoring strategies"
Step 3: Apply refactoring
Step 4: "Use overseer to validate improvements"
```

### 4. Documentation

```
Step 1: Complete module
Step 2: "Use overseer to generate comprehensive documentation"
Step 3: Review in dashboard
Step 4: Commit documentation
```

## Integration with VS Code Features

### Snippets with Third Eye

Create snippets that invoke Third Eye:

`.vscode/snippets.code-snippets`:

```json
{
  "Review with Third Eye": {
    "prefix": "treview",
    "body": [
      "// @third-eye-review",
      "$TM_SELECTED_TEXT",
      "// Review: Use overseer tool to analyze this code"
    ]
  }
}
```

### Tasks with Third Eye

Automate workflows:

```json
{
  "label": "Review Changes",
  "type": "shell",
  "command": "git diff | cline 'Use overseer to review these changes'"
}
```

### Keyboard Shortcuts

Add shortcuts for Third Eye commands:

`.vscode/keybindings.json`:

```json
[
  {
    "key": "ctrl+shift+r",
    "command": "cline.sendMessage",
    "args": "Use overseer tool to review selected code"
  }
]
```

## Best Practices

1. **Start Third Eye first**: Run `bunx third-eye-mcp up` (or `third-eye-mcp up` if installed globally) before opening VS Code
2. **Monitor dashboard**: Keep http://127.0.0.1:3300 open in browser
3. **Use for code reviews**: Let Third Eye catch issues before PR
4. **Document decisions**: Review Evidence tab for audit trail
5. **Optimize routing**: Fast models for quick checks, Claude for deep analysis

## Support

- Dashboard: http://127.0.0.1:3300
- Health check: `bun run health:full`
- Logs: `third-eye-mcp logs`
- Cline docs: [Cline Documentation](https://github.com/saoudrizwan/claude-dev)
- Issues: [GitHub Issues](https://github.com/HishamBS/third-eye-mcp/issues)
