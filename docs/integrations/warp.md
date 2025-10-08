# Warp Terminal Integration Guide

Connect Third Eye MCP to Warp, the AI-enhanced terminal with MCP support.

## Prerequisites

- Warp terminal installed ([Download](https://www.warp.dev/))
- Third Eye MCP installed (`bunx third-eye-mcp up` or global install)
- API keys for Groq and/or OpenRouter

## Configuration

### Step 1: Access Warp AI Settings

1. Open Warp terminal
2. Press Cmd+P (macOS) or Ctrl+P (Linux) to open Command Palette
3. Search for "Settings" or use Cmd+, (Ctrl+, on Linux)
4. Navigate to **AI → MCP Servers**

### Step 2: Add Third Eye MCP Server

In the MCP Servers section, click **Add Server** and configure:

**Server Name**: `third-eye-mcp`

**Command**: `bunx`

**Arguments**:
```
third-eye-mcp
server
```

**Environment Variables**:
```
GROQ_API_KEY=gsk_your_groq_key_here
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_key_here
```

### Step 3: Alternative - Config File Method

Warp stores MCP config at:
- **macOS**: `~/.warp/mcp_servers.json`
- **Linux**: `~/.config/warp-terminal/mcp_servers.json`

Edit the file directly:

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

### Step 4: Configure API Keys

Get your API keys:

1. **Groq** (free tier): [console.groq.com/keys](https://console.groq.com/keys)
2. **OpenRouter** (pay-as-you-go): [openrouter.ai/keys](https://openrouter.ai/keys)

**Local-only setup?**

If using Ollama or LM Studio locally, you can omit API keys:

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

### Step 5: Restart Warp

1. Quit Warp completely (Cmd+Q / Ctrl+Q)
2. Reopen Warp
3. Wait for MCP initialization (check status in AI panel)

## Verification

### Check MCP Status

1. Open Warp AI panel (Cmd+` or click AI icon)
2. Look for "MCP Servers" section
3. Verify `third-eye-mcp` shows as "Connected"

### Test Connection

In Warp terminal, activate AI mode and send:

```
Use the third_eye_overseer tool to check connection status.
```

Expected response:
- Warp AI calls `overseer` tool
- Third Eye processes request
- Dashboard shows session at http://127.0.0.1:3300
- Response appears in Warp AI panel

## Usage Examples

### Command Validation

Before running risky commands:

```
Use the overseer tool to review this command for potential issues:
rm -rf /path/to/directory
```

### Script Analysis

```
Use the overseer tool to analyze this bash script for bugs:

#!/bin/bash
for file in *.txt; do
  mv $file ${file%.txt}.bak
done
```

### Error Debugging

When you get an error:

```
Use the overseer tool to analyze this error and suggest fixes:

[paste error output]
```

### Command History Review

```
Use the overseer tool to review my last 10 commands for security issues.
```

## Warp-Specific Features

### Workflows with Third Eye

Create Warp workflows that use Third Eye:

1. Open Workflows (Cmd+Shift+W)
2. Create new workflow
3. Add step: "AI Review"
4. Command: `echo "$INPUT" | warp ai "Use overseer to review"`

### Blocks with Third Eye

Analyze command blocks:

1. Run a command block
2. Select output
3. Right-click → "Ask Warp AI"
4. Request: "Use overseer tool to analyze this output"

### Terminal Context

Third Eye can analyze terminal context:

```
Use the overseer tool to suggest commands for deploying this app based on my directory structure.
```

## Troubleshooting

### MCP Server Not Connecting

1. **Check server status**:
   ```bash
   bunx third-eye-mcp status
   ```

2. **View Warp logs**:
   - Settings → Advanced → Open Logs
   - Look for MCP-related errors

3. **Test MCP server manually**:
   ```bash
   bunx third-eye-mcp server
   # Should start without errors
   ```

4. **Verify config file**:
   ```bash
   cat ~/.warp/mcp_servers.json | jq .
   ```

### Tool Not Available

1. **Restart Warp completely** (not just close window)
2. **Check AI panel** for MCP status
3. **Update Warp** to latest version
4. **Reinstall Third Eye**:
   ```bash
   npm uninstall -g third-eye-mcp
   npm install -g third-eye-mcp
   ```

### Slow Responses

1. **Use faster models**:
   ```bash
   # Open dashboard
   open http://127.0.0.1:3300

   # Navigate to Models & Routing
   # Set Overseer to llama-3.1-8b-instant
   ```

2. **Enable local inference**:
   ```bash
   # Install Ollama
   curl https://ollama.ai/install.sh | sh

   # Pull fast model
   ollama pull llama3.2
   ```

3. **Monitor performance**:
   ```bash
   # Check dashboard
   open http://127.0.0.1:3300/monitor
   ```

### Provider Connection Issues

1. **Test Groq API**:
   ```bash
   curl https://api.groq.com/openai/v1/models \
     -H "Authorization: Bearer $GROQ_API_KEY"
   ```

2. **Test OpenRouter API**:
   ```bash
   curl https://openrouter.ai/api/v1/models \
     -H "Authorization: Bearer $OPENROUTER_API_KEY"
   ```

3. **Check credits/quota**:
   - Groq: [console.groq.com](https://console.groq.com)
   - OpenRouter: [openrouter.ai/account](https://openrouter.ai/account)

## Advanced Configuration

### Custom Database Location

```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "MCP_DB": "~/Documents/.third-eye/mcp.db",
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

### Multiple Profiles

Create different configs for different projects:

```json
{
  "mcpServers": {
    "third-eye-work": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "MCP_DB": "~/work/.third-eye/mcp.db",
        "MCP_PORT": "7070",
        "GROQ_API_KEY": "gsk_work_key"
      }
    },
    "third-eye-personal": {
      "command": "bunx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "MCP_DB": "~/personal/.third-eye/mcp.db",
        "MCP_PORT": "7071",
        "GROQ_API_KEY": "gsk_personal_key"
      }
    }
  }
}
```

## Workflow Examples

### 1. Pre-Commit Review

```bash
# Stage changes
git add .

# Review with Third Eye
warp ai "Use overseer to review my staged git changes"

# Commit if approved
git commit -m "feat: add feature"
```

### 2. Script Validation

```bash
# Create script
cat > deploy.sh << 'EOF'
#!/bin/bash
npm run build
npm run test
git push
EOF

# Validate with Third Eye
warp ai "Use overseer to review deploy.sh for issues"

# Run if approved
chmod +x deploy.sh
./deploy.sh
```

### 3. Error Debugging

```bash
# Run command that errors
npm run build

# Ask Third Eye for help
warp ai "Use overseer to analyze the error above and suggest fixes"
```

### 4. Infrastructure Review

```bash
# Review Kubernetes config
warp ai "Use overseer to review deployment.yaml for best practices"

# Review Terraform
warp ai "Use overseer to review main.tf for security issues"
```

## Integration with Warp Features

### Warp Drive with Third Eye

Use Warp Drive (cloud sync) to share Third Eye configs across machines:

1. Settings → Warp Drive → Enable
2. MCP configs sync automatically
3. Use Third Eye on any machine with same setup

### Warp Blocks + Third Eye

Create reusable command blocks:

```bash
# Block: Review with Third Eye
echo "Reviewing: $1"
warp ai "Use overseer to analyze: $1"
```

### Warp AI + Third Eye Chaining

Chain multiple AI calls:

```bash
# First: Generate code
warp ai "Generate a bash script to backup database"

# Second: Review generated code
warp ai "Use overseer to review the script above"
```

## Best Practices

1. **Start Third Eye on terminal launch**:
   - Add to shell profile: `alias warp-start='bunx third-eye-mcp up &'`

2. **Monitor dashboard**:
   - Keep http://127.0.0.1:3300 open in browser tab

3. **Review before executing**:
   - Use Third Eye to validate risky commands

4. **Audit trail**:
   - Check dashboard Replay tab for command history

5. **Optimize for speed**:
   - Use fast models (llama-3.1-8b-instant) for quick validations

## Shell Integration

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Start Third Eye MCP on terminal launch
if ! pgrep -f "third-eye-mcp" > /dev/null; then
  bunx third-eye-mcp up --no-ui &
fi

# Alias for quick Third Eye commands
alias teye='bunx third-eye-mcp'
alias teye-status='bunx third-eye-mcp status'
alias teye-logs='bunx third-eye-mcp logs --tail'
alias teye-dash='open http://127.0.0.1:3300'
```

## Support

- Dashboard: http://127.0.0.1:3300
- Health check: `bun run health:full`
- Logs: `bunx third-eye-mcp logs`
- Warp docs: [docs.warp.dev](https://docs.warp.dev/)
- Issues: [GitHub Issues](https://github.com/HishamBS/third-eye-mcp/issues)
