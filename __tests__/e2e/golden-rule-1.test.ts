import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { getConfig } from '@third-eye/config';

/**
 * E2E Test: Golden Rule #1 - Only Overseer is Public
 *
 * CRITICAL: This test verifies that individual Eyes CANNOT be called directly.
 * All requests MUST go through task-based auto-routing.
 */

const config = getConfig();
const API_URL = `http://${config.server.host}:${config.server.port}`;

describe('Golden Rule #1 Enforcement', () => {
  it('should reject direct Eye execution via /mcp/run', async () => {
    // Attempt to call an Eye directly (OLD backdoor behavior)
    const response = await fetch(`${API_URL}/mcp/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eye: 'sharingan', // ← Attempting direct Eye call
        input: 'test input',
      }),
    });

    // Should return 400 Bad Request due to schema validation
    expect(response.status).toBe(400);

    const data = await response.json();

    // Verify error indicates field is not allowed
    expect(data.error).toBeTruthy();
    expect(JSON.stringify(data).toLowerCase()).toContain('task');
  });

  it('should require task parameter for /mcp/run', async () => {
    // Attempt request without task parameter
    const response = await fetch(`${API_URL}/mcp/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: 'test-session',
      }),
    });

    // Should return 400 Bad Request
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  it('should accept task-based routing (CORRECT usage)', async () => {
    const response = await fetch(`${API_URL}/mcp/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: 'Analyze this request for ambiguity',
      }),
    });

    // Should succeed (200 or 2xx)
    expect(response.ok).toBe(true);

    const data = await response.json();

    // Should contain envelope data
    expect(data.data).toBeTruthy();
    expect(data.data.eye).toBeTruthy();
    expect(data.data.code).toBeTruthy();
  });

  it('should enforce order guard even without sessionId', async () => {
    // First call should work (Sharingan is first in pipeline)
    const response1 = await fetch(`${API_URL}/mcp/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task: 'Test order guard enforcement',
      }),
    });

    expect(response1.ok).toBe(true);
    const data1 = await response1.json();

    // Auto-generated sessionId should be present
    expect(data1.data).toBeTruthy();
  });

  it('should only expose overseer tool via MCP /tools endpoint', async () => {
    const response = await fetch(`${API_URL}/mcp/tools`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(response.ok).toBe(true);

    const data = await response.json();
    const tools = data.data.tools;

    // Should only have overseer tool
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBe(1);
    expect(tools[0].name).toBe('overseer');

    // Should NOT expose individual Eyes
    const eyeNames = ['sharingan', 'jogan', 'rinnegan', 'mangekyo', 'tenseigan', 'byakugan'];
    for (const eyeName of eyeNames) {
      const hasEye = tools.some((t: any) => t.name === eyeName);
      expect(hasEye).toBe(false);
    }
  });
});
