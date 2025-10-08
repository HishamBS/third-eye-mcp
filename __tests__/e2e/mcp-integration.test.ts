import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, type ChildProcess } from 'child_process';
import { resolve } from 'path';
import { ListToolsResultSchema, CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';

/**
 * E2E MCP Integration Test
 *
 * Tests real MCP server communication via stdio transport
 * Verifies Golden Rule #1: Only "third_eye_overseer" tool is exposed
 */
describe('MCP Integration E2E', () => {
  let mcpProcess: ChildProcess;
  let client: Client;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    // Start MCP server process
    const serverPath = resolve(process.cwd(), 'bin/mcp-server.ts');

    mcpProcess = spawn('bun', ['run', serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        MCP_DB: ':memory:', // Use in-memory DB for tests
        MCP_AUTO_OPEN: 'false', // Don't open browser in tests
      },
    });

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create client and connect via stdio
    transport = new StdioClientTransport({
      command: 'bun',
      args: ['run', serverPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        MCP_DB: ':memory:',
        MCP_AUTO_OPEN: 'false',
      },
    });

    client = new Client(
      {
        name: 'test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);
  }, 10000);

  afterAll(async () => {
    // Cleanup
    if (client) {
      await client.close();
    }
    if (mcpProcess) {
      mcpProcess.kill();
    }
  });

  describe('Connection and Server Info', () => {
    it('should connect to MCP server successfully', () => {
      expect(client).toBeDefined();
    });

    it('should have correct server info', async () => {
      const serverInfo = await client.getServerVersion();
      expect(serverInfo).toBeDefined();
    });
  });

  describe('Tool Discovery - Golden Rule #1', () => {
    it('should list tools and expose ONLY third_eye_overseer', async () => {
      const result = await client.request(
        { method: 'tools/list' },
        ListToolsResultSchema
      );

      expect(result.tools).toBeDefined();
      expect(result.tools).toHaveLength(1);
      expect(result.tools[0].name).toBe('third_eye_overseer');
    });

    it('should NOT expose individual Eye tools', async () => {
      const result = await client.request(
        { method: 'tools/list' },
        ListToolsResultSchema
      );

      const eyeNames = [
        'sharingan',
        'jogan',
        'rinnegan',
        'mangekyo',
        'tenseigan',
        'byakugan',
        'prompt-helper',
        'prompt_helper',
      ];

      const toolNames = result.tools.map(t => t.name.toLowerCase());

      for (const eyeName of eyeNames) {
        expect(toolNames).not.toContain(eyeName);
        expect(toolNames).not.toContain(`third_eye_${eyeName}`);
      }
    });

    it('should have simplified overseer description', async () => {
      const result = await client.request(
        { method: 'tools/list' },
        ListToolsResultSchema
      );

      const overseer = result.tools[0];
      expect(overseer.description).toBeDefined();

      // Should be simple and not mention "analyze" vs "execute"
      expect(overseer.description.toLowerCase()).toContain('task');
      expect(overseer.description.toLowerCase()).not.toContain('analyze');
      expect(overseer.description.toLowerCase()).not.toContain('execute');
    });

    it('should have simple input schema with only task parameter', async () => {
      const result = await client.request(
        { method: 'tools/list' },
        ListToolsResultSchema
      );

      const overseer = result.tools[0];
      const schema = overseer.inputSchema as any;

      expect(schema.type).toBe('object');
      expect(schema.properties).toBeDefined();
      expect(schema.properties.task).toBeDefined();
      expect(schema.properties.task.type).toBe('string');
      expect(schema.required).toContain('task');

      // Should NOT expose operation, sessionId, config in public schema
      expect(schema.properties.operation).toBeUndefined();
      expect(schema.properties.sessionId).toBeUndefined();
      expect(schema.properties.config).toBeUndefined();
    });
  });

  describe('Tool Execution', () => {
    it('should call overseer tool with simple task', async () => {
      const result = await client.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Analyze this test message',
            },
          },
        },
        CallToolResultSchema
      );

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');
    });

    it('should return structured response with code and verdict', async () => {
      const result = await client.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Review this simple function',
            },
          },
        },
        CallToolResultSchema
      );

      const responseText = result.content[0].text;
      const response = JSON.parse(responseText);

      expect(response.code).toBeDefined();
      expect(response.verdict).toBeDefined();
      expect(response.summary).toBeDefined();
      expect(['OK', 'E_PIPELINE_FAILED', 'E_EXECUTION_FAILED']).toContain(response.code);
      expect(['APPROVED', 'REJECTED']).toContain(response.verdict);
    });

    it('should NOT expose Eye names in error messages', async () => {
      // Try to trigger an order violation or error
      const result = await client.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: '', // Empty task might trigger validation
            },
          },
        },
        CallToolResultSchema
      );

      const responseText = result.content[0].text;

      // Check that response doesn't contain internal Eye names
      const eyeNames = [
        'sharingan',
        'jogan',
        'rinnegan',
        'mangekyo',
        'tenseigan',
        'byakugan',
        'prompt-helper',
      ];

      const lowerResponse = responseText.toLowerCase();
      for (const eyeName of eyeNames) {
        expect(lowerResponse).not.toContain(eyeName);
      }

      // Should only mention "overseer" if any tool name is mentioned
      if (lowerResponse.includes('eye')) {
        expect(lowerResponse).toContain('overseer');
      }
    });

    it('should reject calls to non-existent tools', async () => {
      await expect(
        client.request(
          {
            method: 'tools/call',
            params: {
              name: 'sharingan', // Individual Eye - should be rejected
              arguments: {
                task: 'test',
              },
            },
          },
          CallToolResultSchema
        )
      ).rejects.toThrow();
    });

    it('should include sessionId in metadata without exposing it in schema', async () => {
      const result = await client.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Test session tracking',
            },
          },
        },
        CallToolResultSchema
      );

      const responseText = result.content[0].text;
      const response = JSON.parse(responseText);

      expect(response.metadata).toBeDefined();
      expect(response.metadata.sessionId).toBeDefined();
      expect(typeof response.metadata.sessionId).toBe('string');
    });
  });

  describe('Pipeline Order Violations - Hidden from Agents', () => {
    it('should mask pipeline order violations with generic messages', async () => {
      // This test simulates an order violation scenario
      // The actual violation details should be logged server-side only
      const result = await client.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Invalid pipeline sequence test',
            },
          },
        },
        CallToolResultSchema
      );

      const responseText = result.content[0].text;
      const response = JSON.parse(responseText);

      // If there's an error, it should be generic
      if (response.code === 'NEED_MORE_CONTEXT' || !response.verdict || response.verdict === 'REJECTED') {
        // Should NOT contain internal Eye names
        expect(responseText.toLowerCase()).not.toContain('sharingan');
        expect(responseText.toLowerCase()).not.toContain('jogan');
        expect(responseText.toLowerCase()).not.toContain('rinnegan');

        // Should contain helpful but generic guidance
        if (response.code === 'NEED_MORE_CONTEXT') {
          expect(response.md || response.summary || response.details).toBeDefined();
        }
      }
    });
  });

  describe('Response Format Consistency', () => {
    it('should always return consistent response structure', async () => {
      const result = await client.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Test response structure',
            },
          },
        },
        CallToolResultSchema
      );

      expect(result.content).toBeInstanceOf(Array);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);

      // Required fields
      expect(response).toHaveProperty('code');
      expect(response).toHaveProperty('verdict');
      expect(response).toHaveProperty('summary');

      // Should NOT have internal Eye field names
      expect(response).not.toHaveProperty('eye');
      expect(response).not.toHaveProperty('tag');
    });
  });

  describe('Session Management', () => {
    it('should auto-generate session if not provided', async () => {
      const result = await client.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Session auto-generation test',
            },
          },
        },
        CallToolResultSchema
      );

      const responseText = result.content[0].text;
      const response = JSON.parse(responseText);

      expect(response.metadata).toBeDefined();
      expect(response.metadata.sessionId).toBeDefined();
    });

    it('should reuse session for multiple calls from same agent', async () => {
      const task1 = await client.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'First task in session',
            },
          },
        },
        CallToolResultSchema
      );

      const response1 = JSON.parse(task1.content[0].text);
      const sessionId1 = response1.metadata?.sessionId;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const task2 = await client.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Second task in same session',
            },
          },
        },
        CallToolResultSchema
      );

      const response2 = JSON.parse(task2.content[0].text);
      const sessionId2 = response2.metadata?.sessionId;

      // Should reuse same session (within 30 minutes)
      expect(sessionId1).toBe(sessionId2);
    });
  });
});
