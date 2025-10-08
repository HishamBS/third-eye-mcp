#!/usr/bin/env bun

/**
 * Test MCP Integration
 *
 * Tests the complete Third Eye MCP system integration
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMCPIntegration() {
  console.log('🧿 Testing Third Eye MCP Integration...\n');

  try {
    // Create MCP client
    const transport = new StdioClientTransport({
      command: 'bun',
      args: ['run', 'bin/mcp-server.ts'],
    });

    const client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);

    console.log('✅ Connected to MCP server');

    // Test 1: List available tools
    console.log('\n🔧 Testing tool listing...');
    const tools = await client.listTools();
    console.log(`Found ${tools.tools.length} tools:`);
    tools.tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });

    // Test 2: Test overseer tool with analysis
    console.log('\n🧿 Testing overseer analysis...');
    const analysisResult = await client.callTool({
      name: 'third_eye_overseer',
      arguments: {
        task: 'Create a secure user authentication system with JWT tokens',
        operation: 'analyze',
        config: {
          agentName: 'Test Agent',
          displayName: 'MCP Test',
        },
      },
    });

    if (analysisResult.content[0].type === 'text') {
      const response = JSON.parse(analysisResult.content[0].text);
      console.log('Analysis Result:');
      console.log(`   Code: ${response.code}`);
      console.log(`   Verdict: ${response.verdict}`);
      console.log(`   Summary: ${response.summary}`);
      if (response.metadata?.routing) {
        console.log(`   Task Type: ${response.metadata.routing.taskType}`);
        console.log(`   Complexity: ${response.metadata.routing.complexity}`);
        console.log(`   Recommended Flow: ${response.metadata.routing.recommendedFlow.join(' → ')}`);
      }
    }

    // Test 3: Test guidance tool
    console.log('\n🎯 Testing guidance tool...');
    const guidanceResult = await client.callTool({
      name: 'third_eye_get_guidance',
      arguments: {
        task_description: 'I want to build a web application',
        current_state: 'just starting',
        session_id: 'test-session',
      },
    });

    if (guidanceResult.content[0].type === 'text') {
      const guidance = JSON.parse(guidanceResult.content[0].text);
      console.log('Guidance Result:');
      console.log(`   OK: ${guidance.ok}`);
      if (guidance.guidance?.recommendedTool) {
        console.log(`   Recommended Tool: ${guidance.guidance.recommendedTool}`);
        console.log(`   Reason: ${guidance.guidance.reason}`);
      }
    }

    // Test 4: Test individual Eye tools
    console.log('\n👁️  Testing individual Eye tools...');

    const sharinganResult = await client.callTool({
      name: 'third_eye_sharingan_clarify',
      arguments: {
        prompt: 'Make the app better somehow',
        sessionId: 'test-session',
      },
    });

    if (sharinganResult.content[0].type === 'text') {
      const result = JSON.parse(sharinganResult.content[0].text);
      console.log('Sharingan Result:');
      console.log(`   Code: ${result.code}`);
      console.log(`   Verdict: ${result.verdict}`);
      console.log(`   Summary: ${result.summary?.substring(0, 100)}...`);
    }

    console.log('\n✅ All MCP tests completed successfully!');
    console.log('🧿 Third Eye MCP integration is working correctly!');

    await client.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ MCP integration test failed:', error);
    process.exit(1);
  }
}

// Run test
if (import.meta.main) {
  await testMCPIntegration();
}