# Cursor Integration Guide

Connect Third Eye MCP to Cursor for AI-enhanced coding with multi-provider orchestration.

## Prerequisites

- Cursor installed ([Download](https://cursor.sh/))
- Third Eye MCP installed (`bunx third-eye-mcp up` or global install)
- API keys for Groq and/or OpenRouter

## Configuration

### Step 1: Locate Config File

Cursor MCP configuration file location:

- **macOS/Linux**: `~/.cursor/mcp_settings.json`
- **Windows**: `%APPDATA%\Cursor\mcp_settings.json`

If the file doesn't exist, create it:

```bash
# macOS/Linux
mkdir -p ~/.cursor
touch ~/.cursor/mcp_settings.json

# Windows (PowerShell)
New-Item -Path "$env:APPDATA\Cursor" -ItemType Directory -Force
New-Item -Path "$env:APPDATA\Cursor\mcp_settings.json" -ItemType File
```

### Step 2: Add Third Eye MCP Configuration

Edit `mcp_settings.json`:

```bash
# macOS/Linux
code ~/.cursor/mcp_settings.json

# Windows
code %APPDATA%\Cursor\mcp_settings.json
```

Add the following configuration:

```json
{
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

### Step 3: Configure API Keys

Get your API keys:

1. **Groq** (free tier): [console.groq.com/keys](https://console.groq.com/keys)
2. **OpenRouter** (pay-as-you-go): [openrouter.ai/keys](https://openrouter.ai/keys)

Replace placeholders with actual keys in the config.

### Step 4: Restart Cursor

1. Close Cursor completely (Cmd+Q / Alt+F4)
2. Reopen Cursor
3. Wait 10-15 seconds for MCP initialization

## Verification

### Check MCP Extension

1. Open Cursor Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
2. Search for "MCP"
3. Verify "Model Context Protocol" extension is enabled

### Test Connection

In Cursor's AI chat:

```
Use the third_eye_overseer tool to check if this is working.
```

You should see:
- Tool call to `overseer`
- Response from Third Eye pipeline
- Session visible in dashboard (http://127.0.0.1:3300)

## Usage Examples

### Code Review in Active File

```
Use the overseer tool to review the code in the current file for potential bugs.
```

Third Eye will:
- Route to Sharingan (ambiguity detection)
- Route to Mangekyo (code review gates)
- Return structured analysis

### Generate Tests

```
Use the overseer tool to analyze this function and suggest comprehensive tests:

function calculateDiscount(price, discountPercent) {
  return price * (discountPercent / 100);
}
```

### Refactor Suggestions

```
Use the overseer tool to suggest refactoring improvements for this component.
```

### Documentation Generation

```
Use the overseer tool to generate comprehensive documentation for this module.
```

## Cursor-Specific Features

### Inline Code Analysis

1. **Select code** in editor
2. **Open Cursor AI** (Cmd+K / Ctrl+K)
3. Use command:
   ```
   Use overseer tool to analyze selected code
   ```

### Terminal Integration

Run Third Eye commands directly in Cursor's terminal:

```bash
# Start Third Eye (if not running)
bunx third-eye-mcp up

# Check status
bunx third-eye-mcp status

# View logs
bunx third-eye-mcp logs --tail
```

### Workspace Context

Third Eye can access your entire workspace via Cursor:

```
Use the overseer tool to review the architecture of this project and suggest improvements.
```

## Troubleshooting

### Tool Not Available

1. **Check config file exists**:
   ```bash
   ls -la ~/.cursor/mcp_settings.json
   ```

2. **Verify JSON syntax**:
   ```bash
   cat ~/.cursor/mcp_settings.json | jq .
   ```

3. **Check Cursor logs**:
   - Help → Toggle Developer Tools → Console
   - Look for MCP-related errors

### Third Eye Not Starting

1. **Start manually**:
   ```bash
   bunx third-eye-mcp up --verbose
   ```

2. **Check port availability**:
   ```bash
   lsof -i :7070  # MCP server
   lsof -i :3300  # Dashboard
   ```

3. **Test MCP server directly**:
   ```bash
   bunx third-eye-mcp server
   ```

### Slow Performance

1. **Use faster models** for quick tasks:
   - Dashboard → Models & Routing
   - Set Overseer to `llama-3.1-8b-instant`

2. **Enable local inference**:
   ```bash
   # Install Ollama
   curl https://ollama.ai/install.sh | sh

   # Pull model
   ollama pull llama3.2

   # Third Eye auto-detects
   ```

3. **Monitor performance**:
   - Dashboard → Monitor tab
   - Check Eye execution times
   - Review token usage

### Provider Errors

If Groq/OpenRouter fails:

1. **Check API keys**:
   ```bash
   # Test Groq
   curl https://api.groq.com/openai/v1/models \
     -H "Authorization: Bearer gsk_your_key"

   # Test OpenRouter
   curl https://openrouter.ai/api/v1/models \
     -H "Authorization: Bearer sk-or-v1-your_key"
   ```

2. **Verify quota/credits**:
   - Groq: [console.groq.com](https://console.groq.com)
   - OpenRouter: [openrouter.ai/account](https://openrouter.ai/account)

3. **Check fallback routing**:
   - Dashboard → Models & Routing
   - Ensure fallback models configured

## Advanced Configuration

### Custom Port Configuration

If default ports conflict:

```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "MCP_PORT": "8080",
        "MCP_UI_PORT": "4000",
        "GROQ_API_KEY": "gsk_xxx",
        "OPENROUTER_API_KEY": "sk-or-v1-xxx"
      }
    }
  }
}
```

### Per-Project Configuration

Use different Third Eye instances per project:

```json
{
  "mcpServers": {
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

### Debug Mode

Enable verbose logging:

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

## Workflow Tips

### 1. Code Review Workflow

```
1. Write code in Cursor
2. Select code block
3. Cmd+K → "Use overseer to review"
4. View detailed analysis in chat
5. Check dashboard for evidence trail
```

### 2. Test Generation Workflow

```
1. Write function
2. Request: "Use overseer to generate tests"
3. Third Eye routes: Jogan (intent) → Mangekyo (generation)
4. Insert generated tests
5. Run tests in terminal
```

### 3. Documentation Workflow

```
1. Complete module
2. Request: "Use overseer to generate docs"
3. Review in dashboard (Evidence tab)
4. Approve and insert
```

### 4. Refactoring Workflow

```
1. Identify code smell
2. Request: "Use overseer to suggest refactoring"
3. Review suggestions
4. Apply iteratively
5. Use overseer to verify improvements
```

## Integration with Cursor Features

### Cursor Composer + Third Eye

Cursor Composer can orchestrate Third Eye:

```
Use Composer to create a user authentication system.
During each step, use the overseer tool to validate the design.
```

### Cursor Rules + Third Eye

Add to `.cursorrules`:

```
When reviewing code, always use the third_eye_overseer tool for comprehensive analysis including:
- Ambiguity detection (Sharingan)
- Code quality gates (Mangekyo)
- Evidence validation (Tenseigan)
```

### Git Integration

Use Third Eye for commit reviews:

```
Use the overseer tool to review changes in this commit before I push.
```

## Best Practices

1. **Keep Third Eye running**: Start with `bunx third-eye-mcp up` (or `third-eye-mcp up` if installed globally) when opening Cursor
2. **Use dashboard**: Monitor at http://127.0.0.1:3300 while coding
3. **Review sessions**: Check Replay tab for audit trail
4. **Optimize routing**: Faster models for quick checks, Claude for complex analysis
5. **Version control personas**: Commit custom Eye personas to repo

## Support

- Dashboard: http://127.0.0.1:3300
- Health check: `bun run health:full`
- Logs: `third-eye-mcp logs`
- Issues: [GitHub Issues](https://github.com/HishamBS/third-eye-mcp/issues)
