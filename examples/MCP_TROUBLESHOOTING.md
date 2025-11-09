# Third Eye MCP Connection Troubleshooting Guide

## Problem: "No such file or directory (os error 2)"

This error means the MCP client cannot find the executable specified in your configuration.

## Root Causes

### 1. Relative Path Instead of Absolute Path
**Wrong:**
```json
{
  "command": "bin/mcp-server.ts"
}
```

**Correct:**
```json
{
  "command": "bun",
  "args": ["run", "/home/user/third-eye-mcp/bin/mcp-server.ts"]
}
```

### 2. Package Not Installed Globally
If using `bunx third-eye-mcp server`, the package must be:
- Published to npm registry, OR
- Installed globally via `npm link` or `npm install -g .`

### 3. Wrong Command for Agent
Different agents use different config formats.

## Solutions by Agent

### Warp Terminal

**Config file location:**
- macOS: `~/.warp/mcp_servers.json`
- Linux: `~/.config/warp-terminal/mcp_servers.json`

**Option 1: Direct Path (Recommended)**
```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "bun",
      "args": ["run", "/ABSOLUTE/PATH/TO/third-eye-mcp/bin/mcp-server.ts"],
      "env": {
        "GROQ_API_KEY": "gsk_xxx",
        "OPENROUTER_API_KEY": "sk-or-v1-xxx"
      }
    }
  }
}
```

**Option 2: After Global Install**
```bash
cd /path/to/third-eye-mcp
npm link
```

Then:
```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "third-eye-mcp",
      "args": ["server"],
      "env": {
        "GROQ_API_KEY": "gsk_xxx"
      }
    }
  }
}
```

### Zed Editor

**Config file location:**
- `~/.config/zed/settings.json`

**Configuration:**
```json
{
  "context_servers": {
    "third-eye-mcp": {
      "command": {
        "path": "bun",
        "args": ["run", "/ABSOLUTE/PATH/TO/third-eye-mcp/bin/mcp-server.ts"],
        "env": {
          "GROQ_API_KEY": "gsk_xxx",
          "OPENROUTER_API_KEY": "sk-or-v1-xxx"
        }
      }
    }
  }
}
```

### Claude Desktop

**Config file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**
```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "bun",
      "args": ["run", "/ABSOLUTE/PATH/TO/third-eye-mcp/bin/mcp-server.ts"],
      "env": {
        "GROQ_API_KEY": "gsk_xxx",
        "OPENROUTER_API_KEY": "sk-or-v1-xxx"
      }
    }
  }
}
```

## Verification Steps

### 1. Find Absolute Path
```bash
cd /path/to/third-eye-mcp
pwd
# Copy this output and use it in config
```

### 2. Test Server Manually
```bash
cd /path/to/third-eye-mcp
bun run bin/mcp-server.ts
```

**Expected output:**
```
🔧 Proactively removed empty/corrupted WAL file
✅ Database initialized with 25 tables
🧿 Third Eye MCP Server running on stdio
📡 Ready for agent connections
🔧 Public tool: third_eye_overseer (single entry point)
⚡ Golden Rule #1: Agents call only third_eye_overseer - Eyes are internal
```

### 3. Check Config Syntax
```bash
# For Warp
cat ~/.warp/mcp_servers.json | jq .

# For Zed
cat ~/.config/zed/settings.json | jq .context_servers

# For Claude
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .
```

### 4. Restart Agent Completely
- **Warp**: Quit completely (Cmd+Q / Ctrl+Q), then reopen
- **Zed**: Quit and reopen
- **Claude Desktop**: Quit and reopen

## Common Mistakes

### ❌ Using `~` in path
```json
{
  "command": "bun",
  "args": ["run", "~/third-eye-mcp/bin/mcp-server.ts"]
}
```

**Fix:** Use absolute path `/home/username/` instead of `~`

### ❌ Using relative path
```json
{
  "command": "./bin/mcp-server.ts"
}
```

**Fix:** Use absolute path

### ❌ Missing bun command
```json
{
  "command": "/path/to/bin/mcp-server.ts"
}
```

**Fix:** TypeScript files need `bun run` prefix

### ❌ Wrong config file format
Different agents use different JSON structures. Check examples above.

## Debugging

### View Agent Logs

**Warp:**
```bash
# Check Warp logs for MCP errors
# Settings → Advanced → Open Logs
```

**Zed:**
```bash
# Check Zed logs
tail -f ~/.local/share/zed/logs/*.log
```

**Claude Desktop:**
```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp*.log

# Linux
tail -f ~/.config/Claude/logs/mcp*.log
```

### Test Tool Availability

Once connected, send this message in your agent:

```
Use the third_eye_overseer tool to test connection
```

Expected response:
- Agent calls `third_eye_overseer`
- Returns structured JSON with status
- Check dashboard at http://127.0.0.1:3300 for session

## Why Sequential-Thinking Works But Third-Eye Doesn't

**Sequential-thinking MCP** likely:
1. Is published to npm registry
2. Uses `npx` or `bunx` to auto-download
3. Installed globally on your system

**Third-Eye MCP** (development version):
1. Not published to npm (local development)
2. Requires absolute path configuration
3. OR requires global install via `npm link`

## Global Install Option

If you want to use `bunx third-eye-mcp server` syntax:

```bash
cd /path/to/third-eye-mcp

# Option 1: npm link (symlink to global)
npm link

# Option 2: npm install globally (copies to global)
npm install -g .

# Verify
which third-eye-mcp
third-eye-mcp --version
```

Then update config to:
```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "third-eye-mcp",
      "args": ["server"]
    }
  }
}
```

## Still Not Working?

1. **Check bun is installed:**
   ```bash
   which bun
   bun --version
   ```

2. **Check file exists:**
   ```bash
   ls -la /path/to/third-eye-mcp/bin/mcp-server.ts
   ```

3. **Check file permissions:**
   ```bash
   chmod +x /path/to/third-eye-mcp/bin/mcp-server.ts
   ```

4. **Try built version:**
   ```json
   {
     "command": "bun",
     "args": ["/path/to/third-eye-mcp/dist/mcp-server.js"]
   }
   ```

5. **Check environment variables:**
   Make sure API keys are set in the config or environment

6. **Enable debug logging:**
   ```json
   {
     "env": {
       "DEBUG": "third-eye:*",
       "LOG_LEVEL": "debug"
     }
   }
   ```

## Success Indicators

✅ Agent shows "third-eye-mcp" as "Connected" in MCP status
✅ Tool `third_eye_overseer` appears in available tools list
✅ Sending test message successfully calls the tool
✅ Dashboard at http://127.0.0.1:3300 shows new session
✅ No errors in agent logs

## Next Steps

After connection is established:
1. Send test request to verify tool works
2. Check dashboard for session visibility
3. Review pipeline execution in Monitor tab
4. Configure providers (Groq/OpenRouter) if needed
5. Adjust routing/models for performance

## Support

- Example configs: `/path/to/third-eye-mcp/examples/`
- Integration docs: `/path/to/third-eye-mcp/docs/integrations/`
- Issues: https://github.com/HishamBS/third-eye-mcp/issues
