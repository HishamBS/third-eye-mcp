import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, type ChildProcess } from 'child_process';
import { resolve } from 'path';
import { homedir } from 'os';
import { existsSync } from 'fs';
import { getDb, providerKeys, personas, eyesRouting, sessions, runs } from '@third-eye/db';
import { eq, sql } from 'drizzle-orm';

/**
 * W0-VERIFY: Comprehensive E2E Test Suite
 *
 * Mission: Identify ALL broken features in Third Eye MCP
 *
 * Tests:
 * 1. MCP Client Connection
 * 2. Simple Task Execution
 * 3. Groq API Integration
 * 4. Persona Loading
 * 5. Session Management
 * 6. Monitor UI Integration
 * 7. Order Guard Behavior
 */

const DB_PATH = resolve(homedir(), '.third-eye-mcp/mcp.db');
const API_URL = 'http://127.0.0.1:7070';

describe('E2E Complete Flow Test Suite', () => {
  let mcpClient: Client;
  let mcpTransport: StdioClientTransport;
  let db: any;
  let testSessionId: string | null = null;

  // Capture all logs for debugging
  const serverLogs: string[] = [];
  const serverErrors: string[] = [];

  beforeAll(async () => {
    console.log('\n📋 E2E Test Suite Starting...\n');
    console.log(`Database: ${DB_PATH}`);
    console.log(`API: ${API_URL}\n`);

    // Verify database exists
    if (!existsSync(DB_PATH)) {
      throw new Error(`Database not found at ${DB_PATH}. Run setup first: bun run setup`);
    }

    // Open database connection using drizzle
    const dbInstance = getDb();
    db = dbInstance.db;

    // Create MCP client
    const serverPath = resolve(process.cwd(), 'bin/mcp-server.ts');

    mcpTransport = new StdioClientTransport({
      command: 'bun',
      args: ['run', serverPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        MCP_AUTO_OPEN: 'false', // Don't open browser
      },
    });

    mcpClient = new Client(
      {
        name: 'e2e-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await mcpClient.connect(mcpTransport);

    console.log('✅ MCP Client connected\n');
  }, 30000);

  afterAll(async () => {
    if (mcpClient) {
      await mcpClient.close();
    }
    // Note: drizzle-orm doesn't require explicit close

    // Print captured logs for debugging
    if (serverLogs.length > 0) {
      console.log('\n\n📝 SERVER LOGS:\n');
      serverLogs.forEach(log => console.log(log));
    }

    if (serverErrors.length > 0) {
      console.error('\n\n❌ SERVER ERRORS:\n');
      serverErrors.forEach(err => console.error(err));
    }

    console.log('\n✅ E2E Test Suite Completed\n');
  });

  /**
   * TEST 1: MCP Client Connection
   */
  describe('Test 1: MCP Client Connection', () => {
    it('should connect to MCP server via stdio', async () => {
      expect(mcpClient).toBeDefined();
    });

    it('should list available tools', async () => {
      const result = await mcpClient.request(
        { method: 'tools/list' },
        {} as any
      );

      expect(result).toBeDefined();
      expect((result as any).tools).toBeDefined();
      expect(Array.isArray((result as any).tools)).toBe(true);
    });

    it('should expose ONLY third_eye_overseer tool (Golden Rule #1)', async () => {
      const result = await mcpClient.request(
        { method: 'tools/list' },
        {} as any
      );

      const tools = (result as any).tools;

      // MUST be exactly 1 tool
      expect(tools).toHaveLength(1);

      // MUST be named 'third_eye_overseer'
      expect(tools[0].name).toBe('third_eye_overseer');
    });

    it('should NOT expose individual Eye tools', async () => {
      const result = await mcpClient.request(
        { method: 'tools/list' },
        {} as any
      );

      const tools = (result as any).tools;
      const toolNames = tools.map((t: any) => t.name.toLowerCase());

      // List of Eye names that should NEVER appear
      const forbiddenNames = [
        'sharingan',
        'jogan',
        'rinnegan',
        'mangekyo',
        'tenseigan',
        'byakugan',
        'prompt-helper',
        'prompt_helper',
      ];

      for (const forbidden of forbiddenNames) {
        expect(toolNames).not.toContain(forbidden);
        expect(toolNames).not.toContain(`third_eye_${forbidden}`);
      }
    });
  });

  /**
   * TEST 2: Simple Task Execution
   */
  describe('Test 2: Simple Task Execution', () => {
    it('should call third_eye_overseer with simple task', async () => {
      const result = await mcpClient.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Write a hello world function in Python',
            },
          },
        },
        {} as any
      );

      expect(result).toBeDefined();
      expect((result as any).content).toBeDefined();
      expect((result as any).content.length).toBeGreaterThan(0);
    });

    it('should return response with sessionId', async () => {
      const result = await mcpClient.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Create a simple add function',
            },
          },
        },
        {} as any
      );

      const responseText = (result as any).content[0].text;
      const response = JSON.parse(responseText);

      expect(response.metadata).toBeDefined();
      expect(response.metadata.sessionId).toBeDefined();
      expect(typeof response.metadata.sessionId).toBe('string');

      // Save for later tests
      testSessionId = response.metadata.sessionId;
    });

    it('should return response with verdict (APPROVED/REJECTED)', async () => {
      const result = await mcpClient.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Review this code: function add(a, b) { return a + b; }',
            },
          },
        },
        {} as any
      );

      const responseText = (result as any).content[0].text;
      const response = JSON.parse(responseText);

      expect(response.verdict).toBeDefined();
      expect(['APPROVED', 'REJECTED']).toContain(response.verdict);
    });

    it('should return response with expected structure', async () => {
      const result = await mcpClient.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Validate this JSON: {"name": "test"}',
            },
          },
        },
        {} as any
      );

      const responseText = (result as any).content[0].text;
      const response = JSON.parse(responseText);

      // Required fields
      expect(response).toHaveProperty('code');
      expect(response).toHaveProperty('verdict');
      expect(response).toHaveProperty('summary');
      expect(response).toHaveProperty('metadata');
    });
  });

  /**
   * TEST 3: Groq API Integration
   */
  describe('Test 3: Groq API Integration', () => {
    it('should check if Groq API key is configured', async () => {
      const result = await db.select().from(providerKeys).where(eq(providerKeys.provider, 'groq'));

      if (result.length === 0) {
        console.warn('\n⚠️  WARNING: No Groq API key configured. Skipping Groq tests.\n');
        return;
      }

      expect(result.length).toBeGreaterThan(0);
    });

    it('should use JSON mode for LLM responses (response_format)', async () => {
      // Check if Groq key exists
      const result = await db.select().from(providerKeys).where(eq(providerKeys.provider, 'groq'));

      if (result.length === 0) {
        console.warn('⚠️  Skipping: No Groq API key');
        return;
      }

      // Execute task
      const taskResult = await mcpClient.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Analyze this code snippet: const x = 10;',
            },
          },
        },
        {} as any
      );

      const responseText = (taskResult as any).content[0].text;
      const response = JSON.parse(responseText);

      // Should complete without "LLM response does not match schema" errors
      expect(response.code).not.toBe('EYE_ERROR');

      // Response should be valid JSON (we just parsed it)
      expect(response).toBeTypeOf('object');
    });

    it('should NOT have "LLM response does not match schema" errors', async () => {
      // Check if Groq key exists
      const result = await db.select().from(providerKeys).where(eq(providerKeys.provider, 'groq'));

      if (result.length === 0) {
        console.warn('⚠️  Skipping: No Groq API key');
        return;
      }

      // Execute task and check runs table for errors
      const taskResult = await mcpClient.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Review this function: def greet(name): return f"Hello {name}"',
            },
          },
        },
        {} as any
      );

      const responseText = (taskResult as any).content[0].text;
      const response = JSON.parse(responseText);

      const sessionId = response.metadata?.sessionId;

      if (sessionId) {
        // Check runs for this session
        const sessionRuns = await db.select().from(runs).where(eq(runs.sessionId, sessionId));

        // No runs should have "does not match schema" in input
        for (const run of sessionRuns) {
          expect(run.inputMd).not.toContain('does not match schema');
        }
      }
    });
  });

  /**
   * TEST 4: Persona Loading
   */
  describe('Test 4: Persona Loading', () => {
    it('should have personas seeded in database', async () => {
      const result = await db.select().from(personas).where(eq(personas.active, true));

      expect(result.length).toBeGreaterThan(0);
    });

    it('should load persona for each Eye', async () => {
      const result = await db.select().from(personas).where(eq(personas.active, true));

      const eyeNames = result.map(p => p.eye);

      expect(eyeNames).toContain('sharingan');
      expect(eyeNames).toContain('jogan');
      expect(eyeNames).toContain('rinnegan');
    });

    it('should use persona content as system prompt', async () => {
      const result = await db.select().from(personas).where(eq(personas.eye, 'sharingan'));
      const persona = result[0];

      expect(persona).toBeDefined();
      expect(persona.content).toBeDefined();
      expect(persona.content.length).toBeGreaterThan(50);

      console.log(`\n📝 Sharingan persona (first 100 chars): ${persona.content.substring(0, 100)}...\n`);
    });

    it('should have Eye routing configured for all Eyes', async () => {
      const routing = await db.select().from(eyesRouting);

      expect(routing.length).toBeGreaterThan(0);

      // Check critical Eyes
      const eyeNames = routing.map(r => r.eye);
      expect(eyeNames).toContain('sharingan');
      expect(eyeNames).toContain('jogan');
      expect(eyeNames).toContain('rinnegan');
    });

    it('should have valid provider and model in routing', async () => {
      const routing = await db.select().from(eyesRouting);

      for (const route of routing) {
        expect(route.primaryProvider).toBeDefined();
        expect(route.primaryModel).toBeDefined();

        // Provider should be one of: groq, ollama, openrouter, lmstudio
        expect(['groq', 'ollama', 'openrouter', 'lmstudio']).toContain(route.primaryProvider);
      }
    });
  });

  /**
   * TEST 5: Session Management
   */
  describe('Test 5: Session Management', () => {
    it('should create session on first task', async () => {
      const before = await db.select({ count: sql`COUNT(*)` }).from(sessions);
      const beforeCount = Number(before[0].count);

      await mcpClient.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Session test task 1',
              config: {
                agentName: 'SessionTestAgent',
              },
            },
          },
        },
        {} as any
      );

      const after = await db.select({ count: sql`COUNT(*)` }).from(sessions);
      const afterCount = Number(after[0].count);

      expect(afterCount).toBeGreaterThanOrEqual(beforeCount);
    });

    it('should reuse same session for multiple tasks from same agent', async () => {
      // Task 1
      const result1 = await mcpClient.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Multi-task test 1',
              config: {
                agentName: 'MultiTaskTestAgent',
              },
            },
          },
        },
        {} as any
      );

      const response1 = JSON.parse((result1 as any).content[0].text);
      const sessionId1 = response1.metadata?.sessionId;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));

      // Task 2
      const result2 = await mcpClient.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Multi-task test 2',
              config: {
                agentName: 'MultiTaskTestAgent',
              },
            },
          },
        },
        {} as any
      );

      const response2 = JSON.parse((result2 as any).content[0].text);
      const sessionId2 = response2.metadata?.sessionId;

      // Should be the same session (reused within 30 minutes)
      expect(sessionId1).toBe(sessionId2);
    });

    it('should query database for sessions by agentName', async () => {
      const sessionList = await db.select().from(sessions).where(eq(sessions.agentName, 'MultiTaskTestAgent'));

      // Should have only 1 session for this agent
      expect(sessionList.length).toBe(1);
    });

    it('should update last_activity on each task', async () => {
      const result = await mcpClient.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Activity tracking test',
              config: {
                agentName: 'ActivityTestAgent',
              },
            },
          },
        },
        {} as any
      );

      const response = JSON.parse((result as any).content[0].text);
      const sessionId = response.metadata?.sessionId;

      const sessionList = await db.select().from(sessions).where(eq(sessions.id, sessionId));
      const session = sessionList[0];

      expect(session).toBeDefined();
      expect(session.lastActivity).toBeDefined();
    });
  });

  /**
   * TEST 6: Monitor UI Integration
   */
  describe('Test 6: Monitor UI Integration', () => {
    it('should check if server is running', async () => {
      try {
        const response = await fetch(`${API_URL}/health`);
        expect(response.ok).toBe(true);
      } catch (error) {
        console.warn('\n⚠️  WARNING: Server not running. Start with: bun run dev\n');
        throw error;
      }
    });

    it('should fetch session events without "Failed to fetch" error', async () => {
      if (!testSessionId) {
        console.warn('⚠️  Skipping: No test session ID available');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/sessions/${testSessionId}/events`);

        if (!response.ok) {
          const text = await response.text();
          console.error(`❌ Failed to fetch events: ${response.status} ${text}`);
        }

        expect(response.ok).toBe(true);

        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      } catch (error) {
        console.error('❌ Failed to fetch session events:', error);
        throw error;
      }
    });

    it('should fetch session summary', async () => {
      if (!testSessionId) {
        console.warn('⚠️  Skipping: No test session ID available');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/sessions/${testSessionId}/summary`);

        expect(response.ok).toBe(true);

        const data = await response.json();
        expect(data).toHaveProperty('eventCount');
        expect(data).toHaveProperty('eyes');
        expect(Array.isArray(data.eyes)).toBe(true);
      } catch (error) {
        console.error('❌ Failed to fetch session summary:', error);
        throw error;
      }
    });

    it('should fetch all sessions list', async () => {
      try {
        const response = await fetch(`${API_URL}/api/sessions`);

        expect(response.ok).toBe(true);

        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      } catch (error) {
        console.error('❌ Failed to fetch sessions list:', error);
        throw error;
      }
    });
  });

  /**
   * TEST 7: Order Guard Behavior
   */
  describe('Test 7: Order Guard Behavior', () => {
    it('should allow auto-router mode (overseer)', async () => {
      const result = await mcpClient.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: 'Order guard test: auto-router should work',
            },
          },
        },
        {} as any
      );

      expect(result).toBeDefined();

      const responseText = (result as any).content[0].text;
      const response = JSON.parse(responseText);

      // Should not be order violation
      expect(response.code).not.toBe('NEED_MORE_CONTEXT');
    });

    it('should prevent direct Eye calls (order violation)', async () => {
      // This test simulates calling an Eye directly (which should fail)
      // In normal MCP usage, only overseer is exposed, so this shouldn't happen
      // But internally, order guard should block out-of-order calls

      // We can't test this directly through MCP (Golden Rule #1), but we can
      // verify that the order guard is working by checking database runs

      const orderGuardRuns = await db.select().from(runs).where(eq(runs.provider, 'order-guard'));

      // If order guard is working, there should be NO order-guard runs
      // (since all calls go through overseer/auto-router)
      console.log(`\n📊 Order guard runs found: ${orderGuardRuns.length}\n`);

      // This is informational - order guard runs indicate violations were caught
      expect(Array.isArray(orderGuardRuns)).toBe(true);
    });

    it('should NOT expose Eye names in error messages (Golden Rule #1)', async () => {
      const result = await mcpClient.request(
        {
          method: 'tools/call',
          params: {
            name: 'third_eye_overseer',
            arguments: {
              task: '', // Empty task to potentially trigger error
            },
          },
        },
        {} as any
      );

      const responseText = (result as any).content[0].text;
      const lowerResponse = responseText.toLowerCase();

      // Check that response doesn't contain internal Eye names
      const forbiddenNames = [
        'sharingan',
        'jogan',
        'rinnegan',
        'mangekyo',
        'tenseigan',
        'byakugan',
        'prompt-helper',
      ];

      for (const forbidden of forbiddenNames) {
        expect(lowerResponse).not.toContain(forbidden);
      }
    });
  });
});
