#!/usr/bin/env bun

/**
 * Test MCP Server Connection
 *
 * Simulates what Claude Desktop does when connecting to an MCP server
 */

import { spawn } from 'child_process';

console.log('🧪 Testing Third Eye MCP Server...\n');

// Start MCP server as stdio process
const mcpProcess = spawn('bun', ['run', 'bin/mcp-server.ts'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let hasResponse = false;

mcpProcess.stdout.on('data', (data) => {
  output += data.toString();

  // Check for JSON-RPC response
  try {
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('{')) {
        const msg = JSON.parse(line);
        if (msg.result && msg.result.tools) {
          console.log(`✅ MCP Server responded with ${msg.result.tools.length} tools:`);
          msg.result.tools.forEach((tool: any) => {
            console.log(`   - ${tool.name}`);
          });
          hasResponse = true;
          mcpProcess.kill();
        } else if (msg.result) {
          console.log('✅ Server initialization:', msg.result);
        }
      }
    }
  } catch (e) {
    // Not JSON yet, keep reading
  }
});

mcpProcess.stderr.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('THIRD_EYE_API_KEY')) {
    console.log('⚠️  Warning:', msg.trim());
  } else if (!msg.includes('Migration warning')) {
    console.error('❌ Error:', msg);
  }
});

mcpProcess.on('close', (code) => {
  if (!hasResponse) {
    console.log('\n❌ No response received from MCP server');
    console.log('Raw output:', output);
  }
  process.exit(code || 0);
});

// Send initialize request (JSON-RPC 2.0)
setTimeout(() => {
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  console.log('📤 Sending initialize request...');
  mcpProcess.stdin.write(JSON.stringify(initRequest) + '\n');
}, 1000);

// Send list tools request
setTimeout(() => {
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };

  console.log('📤 Sending tools/list request...\n');
  mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 2000);

// Timeout after 5 seconds
setTimeout(() => {
  if (!hasResponse) {
    console.log('\n⏱️  Timeout - no response after 5 seconds');
    mcpProcess.kill();
  }
}, 5000);
