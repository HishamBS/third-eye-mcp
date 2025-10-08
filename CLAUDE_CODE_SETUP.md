# Claude Code Auto-Approval Configuration ✅

## Overview
This project is configured to **bypass ALL permission prompts** in Claude Code VSCode extension using `"defaultMode": "bypassPermissions"`, allowing Claude to work completely autonomously after you approve the initial plan.

## What Was Configured

### Project-Level Settings (The ONLY Place That Matters)
**Location:** `.claude/settings.json`

The key setting:
```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "defaultMode": "bypassPermissions"
  }
}
```

**IMPORTANT DISCOVERY:** Permission settings go in **`.claude/settings.json`**, **NOT** in VSCode's `settings.json`.

The VSCode extension (`anthropic.claude-code`) only supports these 3 settings:
- `claude-code.selectedModel`
- `claude-code.environmentVariables`
- `claude-code.useTerminal`

Any `claude.permissions` or `claude.defaultMode` in VSCode settings are **invalid** and will be ignored (shown grayed out).

### Available Permission Modes

According to the official schema (from the extension's `claude-code-settings.schema.json`):

1. **`"default"`** - Prompt for first-time tool use
2. **`"plan"`** - Read-only mode, no edits allowed
3. **`"acceptEdits"`** - Auto-approve file edits, but still prompt for other tools
4. **`"bypassPermissions"`** ⭐ **← This project uses this** - Skip ALL permission checks

## How It Works

With `"defaultMode": "bypassPermissions"` in `.claude/settings.json`:

✅ **Auto-approved (no prompts):**
- All file operations (Read, Write, Edit)
- All bash commands matching the `allow` list
- All tool calls (Glob, Grep, TodoWrite, Task, WebFetch, etc.)
- All MCP tools (`mcp__*`)

⚠️ **Still prompts (safety):**
- `rm` commands (file deletion)
- `sudo` commands (system-level changes)
- `git push` and `git push --force` (these are in the `ask` list)

## How to Use

### Option 1: Just Approve the Plan (Recommended)
1. Give Claude a task
2. Approve the plan when asked
3. **That's it!** No more prompts (unless it's a dangerous `ask` operation)

### Option 2: Switch to Terminal Mode
If you prefer the terminal experience:
1. Set in VSCode settings: `"claude-code.useTerminal": true`
2. Or use: `claude --dangerously-skip-permissions` directly in terminal

## Project Structure

```
third-eye-mcp/
├── .claude/
│   └── settings.json          ← Permission config (bypassPermissions mode)
└── CLAUDE_CODE_SETUP.md       ← This file
```

## Troubleshooting

### Still Getting Prompts?

1. **Check the file exists:**
   ```bash
   cat .claude/settings.json
   ```
   Should show `"defaultMode": "bypassPermissions"`

2. **Restart Claude Code:**
   - Close and reopen the Claude Code chat
   - Or reload VSCode window (Cmd+Shift+P → "Developer: Reload Window")

3. **Verify you're in the right directory:**
   Claude Code looks for `.claude/settings.json` in your project root

### Want to Add More Allowed Commands?

Edit `.claude/settings.json`:
```json
{
  "permissions": {
    "defaultMode": "bypassPermissions",
    "allow": [
      "Bash(your-new-command:*)",
      "Read(*)",
      "Write(*)"
    ]
  }
}
```

### Want to Block Specific Operations?

Use the `deny` list:
```json
{
  "permissions": {
    "defaultMode": "bypassPermissions",
    "deny": [
      "Bash(rm -rf /*:*)",
      "Bash(curl *secrets*:*)"
    ]
  }
}
```

## Permission Hierarchy

Claude Code applies settings in this order (highest to lowest priority):
1. Enterprise managed policies
2. Command line arguments (`--dangerously-skip-permissions`)
3. **Local project settings** (`.claude/settings.json`) ← **This project**
4. Shared project settings
5. User settings (`~/.claude/settings.json`)

## Security Considerations

⚠️ **`bypassPermissions` is powerful but risky:**

**Safe to use when:**
- Working on your own projects
- You trust the codebase
- You trust your prompts to Claude
- You have backups/version control

**NOT safe when:**
- Working with untrusted code
- In production environments without backups
- With untested prompts that could cause data loss

**Best practices:**
- Keep the `ask` rules for `rm`, `sudo`, and `git push --force`
- Use version control (git) religiously
- Test in isolated environments first
- Consider using Docker containers for maximum isolation

## Alternative: Full Bypass from Terminal

For **zero interruptions** (accepts even more risks):

```bash
cd /path/to/third-eye-mcp
claude --dangerously-skip-permissions
```

This bypasses **everything** including the `ask` rules. Only use in:
- Docker containers without network access
- VMs with snapshots
- Disposable development environments

## Verification

To verify your setup is working:

1. **Check settings file:**
   ```bash
   cat .claude/settings.json | grep defaultMode
   ```
   Should output: `"defaultMode": "bypassPermissions",`

2. **Test with Claude:**
   - Ask: "Read package.json and tell me the version"
   - Should proceed **without prompting** for Read permission

3. **Test dangerous operation:**
   - Ask: "Show me what `rm -rf` would do"
   - **Should still prompt** (because it's in the `ask` list)

## References

- [Claude Code Settings Schema](https://json.schemastore.org/claude-code-settings.json)
- [Official Claude Code Docs](https://docs.claude.com/en/docs/claude-code/settings)
- [Permission Modes Documentation](https://docs.claude.com/en/docs/claude-code/settings#permission-modes)
- [VSCode Extension Package](file:///Users/hbinseddeq/.vscode/extensions/anthropic.claude-code-2.0.10/package.json)

---

**Last Updated:** 2025-10-08
**Extension Version:** anthropic.claude-code v2.0.10
**Schema Version:** Generated on 2025-10-07T20:10:20.124Z
