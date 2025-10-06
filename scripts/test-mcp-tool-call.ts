#!/usr/bin/env bun

/**
 * Test MCP Tool Call
 *
 * Calls overseer/navigator to verify tool execution works
 */

import { spawn } from 'child_process';

console.log('🧪 Testing MCP Tool Call: overseer/navigator\n');

const mcpProcess = spawn('bun', ['run', 'bin/mcp-server.ts'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let initialized = false;

mcpProcess.stdout.on('data', (data) => {
  output += data.toString();

  const lines = output.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('{')) {
      try {
        const msg = JSON.parse(line);

        if (msg.id === 1 && msg.result) {
          console.log('✅ Server initialized');
          initialized = true;

          // Send tool call request
          const toolCallRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'overseer/navigator',
              arguments: {
                context: {
                  session_id: 'test-session',
                  user_id: 'test-user',
                  lang: 'en',
                  budget_tokens: 10000
                },
                payload: {
                  request_md: 'Build a simple TODO app with React'
                },
                reasoning_md: 'User wants to build a TODO application'
              }
            }
          };

          console.log('📤 Calling overseer/navigator...\n');
          mcpProcess.stdin.write(JSON.stringify(toolCallRequest) + '\n');
        }

        if (msg.id === 2 && msg.result) {
          console.log('✅ Tool call succeeded!\n');
          console.log('Response:', JSON.stringify(msg.result, null, 2));
          mcpProcess.kill();
        }

        if (msg.error) {
          console.error('❌ Error:', msg.error);
          mcpProcess.kill();
        }
      } catch (e) {
        // Not complete JSON yet
      }
    }
  }
});

mcpProcess.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('Third Eye MCP')) {
    console.log('📋', msg.trim());
  }
});

// Initialize
setTimeout(() => {
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }
  };

  mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');
}, 500);

// Timeout
setTimeout(() => {
  console.log('\n⏱️  Timeout');
  mcpProcess.kill();
}, 15000);
