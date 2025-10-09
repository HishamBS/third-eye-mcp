# Claude Desktop Integration Guide

Connect Third Eye MCP to Claude Desktop for enhanced AI orchestration with multi-provider support.

## Prerequisites

- Claude Desktop installed ([Download](https://claude.ai/desktop))
- Third Eye MCP installed (`bunx third-eye-mcp up` or global install)
- API keys for Groq and/or OpenRouter

## Configuration

### Step 1: Locate Config File

The Claude Desktop MCP configuration file location depends on your OS:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Step 2: Edit Configuration

Open the config file in your text editor:

```bash
# macOS
open ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Linux
nano ~/.config/Claude/claude_desktop_config.json

# Windows (PowerShell)
notepad $env:APPDATA\Claude\claude_desktop_config.json
```

### Step 3: Add Third Eye MCP Server

Add the following configuration to your `claude_desktop_config.json`:

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

If you already have other MCP servers configured, add Third Eye MCP to the existing `mcpServers` object:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/files"]
    },
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

Replace the placeholder API keys with your actual keys:

1. **Groq API Key**:
   - Get from [console.groq.com/keys](https://console.groq.com/keys)
   - Format: `gsk_xxxxxxxxxxxxx`
   - Free tier available

2. **OpenRouter API Key**:
   - Get from [openrouter.ai/keys](https://openrouter.ai/keys)
   - Format: `sk-or-v1-xxxxxxxxxxxxx`
   - Pay-as-you-go pricing

**Local-only setup (no API keys)?**

If you're using Ollama or LM Studio locally, you can omit the API keys:

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

### Step 5: Alternative - Global Installation

If you've installed Third Eye MCP globally, use the direct command:

```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "third-eye-mcp",
      "args": ["server"],
      "env": {
        "GROQ_API_KEY": "gsk_your_groq_key_here",
        "OPENROUTER_API_KEY": "sk-or-v1-your_openrouter_key_here"
      }
    }
  }
}
```

### Step 6: Restart Claude Desktop

1. Quit Claude Desktop completely (Cmd+Q on macOS, Alt+F4 on Windows)
2. Reopen Claude Desktop
3. Wait 10-15 seconds for MCP servers to initialize

## Verification

### Check MCP Tool Availability

Once Claude Desktop restarts, you should see the Third Eye MCP tool available. Test with:

```
Can you show me what MCP tools are available?
```

You should see `third_eye_overseer` in the list.

### Test Connection

Send a test request to verify the connection:

```
Use the third_eye_overseer tool to analyze this text: "Hello world"
```

Expected response:
- Claude will call the `overseer` tool
- Third Eye will process through its Eye pipeline
- You'll receive structured analysis
- Check the dashboard at http://127.0.0.1:3300 to see the session

### Monitor in Dashboard

1. Keep Third Eye MCP running: `bunx third-eye-mcp up`
2. Open dashboard: http://127.0.0.1:3300
3. Go to **Monitor** tab
4. Send messages in Claude Desktop
5. Watch real-time pipeline execution

## Usage Examples

### Code Review with Sharingan

```
Use the overseer tool to review this code:

function add(a, b) {
  return a - b;  // Bug: should be +
}
```

Third Eye will route through Sharingan (code analysis) and Mangekyo (code review).

### Requirements Analysis

```
Use the overseer tool to analyze requirements for a user authentication system.
```

Third Eye will use Jogan (intent detection) and Rinnegan (plan validation).

### Translation with Byakugan

```
Use the overseer tool to translate "Hello, how are you?" to Spanish.
```

Third Eye will route to Byakugan (clarity and translation).

## Troubleshooting

### Tool Not Appearing

1. **Check config file syntax**:
   ```bash
   # macOS/Linux
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .

   # Should output valid JSON without errors
   ```

2. **Verify Third Eye MCP is installed**:
   ```bash
   third-eye-mcp --version
   ```

3. **Check Claude Desktop logs**:
   ```bash
   # macOS
   tail -f ~/Library/Logs/Claude/mcp*.log

   # Windows
   type %LOCALAPPDATA%\Claude\Logs\mcp*.log
   ```

### Connection Errors

1. **Start Third Eye MCP separately**:
   ```bash
   # Terminal 1: Start Third Eye services
   bunx third-eye-mcp up --verbose

   # Terminal 2: Test MCP server directly
   bunx third-eye-mcp server
   ```

2. **Check for errors** in verbose output

3. **Verify API keys** are correct and have quota

### Slow Responses

1. **Use faster models** for quick tasks:
   - Go to http://127.0.0.1:3300/models
   - Assign `llama-3.1-8b-instant` to Overseer and Sharingan

2. **Check provider status**:
   - Dashboard → Settings → Provider Keys
   - Ensure green status indicators

3. **Use local models** for fastest response:
   - Install Ollama: `brew install ollama`
   - Pull model: `ollama pull llama3.2`
   - Third Eye will auto-detect

### Invalid Responses

If Eyes return malformed data:

1. **Check strictness level**:
   - Dashboard → Strictness Profiles
   - Try lower strictness (level 3-5) for permissive mode

2. **Review persona prompts**:
   - Dashboard → Personas
   - Edit Eye personas to improve output format

3. **Check model compatibility**:
   - Some models struggle with strict JSON schemas
   - Try Claude 3.5 Sonnet fallback

## Advanced Configuration

### Custom Database Location

```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "npx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "MCP_DB": "/custom/path/mcp.db",
        "GROQ_API_KEY": "gsk_xxx",
        "OPENROUTER_API_KEY": "sk-or-v1-xxx"
      }
    }
  }
}
```

### Enable Debug Logging

```json
{
  "mcpServers": {
    "third-eye-mcp": {
      "command": "npx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "DEBUG": "third-eye:*",
        "GROQ_API_KEY": "gsk_xxx",
        "OPENROUTER_API_KEY": "sk-or-v1-xxx"
      }
    }
  }
}
```

### Multiple Third Eye Instances

Run separate instances for different projects:

```json
{
  "mcpServers": {
    "third-eye-work": {
      "command": "npx",
      "args": ["third-eye-mcp", "server"],
      "env": {
        "MCP_DB": "~/work/.third-eye/mcp.db",
        "MCP_PORT": "7070",
        "GROQ_API_KEY": "gsk_work_key"
      }
    },
    "third-eye-personal": {
      "command": "npx",
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

## Best Practices

1. **Keep Third Eye running**: Start with `bunx third-eye-mcp up` (or `third-eye-mcp up` if installed globally) before using Claude
2. **Monitor dashboard**: Watch real-time execution at http://127.0.0.1:3300
3. **Review sessions**: Use Replay to audit AI decisions
4. **Optimize routing**: Assign faster models to frequently used Eyes
5. **Version personas**: Edit and test personas without restarting services

## Support

- Dashboard: http://127.0.0.1:3300
- Health check: `bun run health:full`
- Logs: `third-eye-mcp logs --tail`
- Issues: [GitHub Issues](https://github.com/HishamBS/third-eye-mcp/issues)
