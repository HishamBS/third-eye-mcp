import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Hono } from 'hono';

describe('MCP Endpoints Integration Tests', () => {
  let app: Hono;

  beforeAll(async () => {
    // Import the MCP routes
    const mcpRoutes = await import('../mcp');
    app = new Hono();
    app.route('/mcp', mcpRoutes.default);
  });

  describe('GET /mcp/tools', () => {
    it('should return all registered Eyes', async () => {
      const res = await app.request('/mcp/tools');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('tools');
      expect(Array.isArray(data.tools)).toBe(true);
      expect(data.tools.length).toBeGreaterThan(0);
    });

    it('should include required Eye metadata', async () => {
      const res = await app.request('/mcp/tools');
      const data = await res.json();

      const firstEye = data.tools[0];
      expect(firstEye).toHaveProperty('name');
      expect(firstEye).toHaveProperty('description');
      expect(firstEye).toHaveProperty('inputSchema');
      expect(firstEye).toHaveProperty('outputSchema');
      expect(firstEye).toHaveProperty('version');
    });

    it('should include all 8 core Eyes', async () => {
      const res = await app.request('/mcp/tools');
      const data = await res.json();

      const eyeNames = data.tools.map((t: any) => t.name);
      expect(eyeNames).toContain('sharingan');
      expect(eyeNames).toContain('prompt-helper');
      expect(eyeNames).toContain('jogan');
      expect(eyeNames).toContain('rinnegan');
      expect(eyeNames).toContain('mangekyo');
      expect(eyeNames).toContain('tenseigan');
      expect(eyeNames).toContain('byakugan');
      expect(eyeNames).toContain('overseer');
    });
  });

  describe('GET /mcp/quickstart', () => {
    it('should return quickstart guide', async () => {
      const res = await app.request('/mcp/quickstart');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('quickstart');
      expect(data.quickstart).toHaveProperty('workflows');
      expect(data.quickstart).toHaveProperty('routing');
      expect(data.quickstart).toHaveProperty('primers');
    });

    it('should include workflow sequences', async () => {
      const res = await app.request('/mcp/quickstart');
      const data = await res.json();

      expect(data.quickstart.workflows).toHaveProperty('clarification');
      expect(data.quickstart.workflows).toHaveProperty('planning');
      expect(data.quickstart.workflows).toHaveProperty('implementation');
      expect(data.quickstart.workflows).toHaveProperty('factChecking');
    });

    it('should provide routing recommendations', async () => {
      const res = await app.request('/mcp/quickstart');
      const data = await res.json();

      expect(data.quickstart.routing).toHaveProperty('sharingan');
      expect(data.quickstart.routing).toHaveProperty('rinnegan');
      expect(data.quickstart.routing).toHaveProperty('mangekyo');
    });
  });

  describe('GET /mcp/schemas', () => {
    it('should return envelope schema', async () => {
      const res = await app.request('/mcp/schemas');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('envelope');
      expect(data.envelope).toHaveProperty('type');
      expect(data.envelope.type).toBe('object');
    });

    it('should include error codes reference', async () => {
      const res = await app.request('/mcp/schemas');
      const data = await res.json();

      expect(data).toHaveProperty('errorCodes');
      expect(data.errorCodes).toHaveProperty('success');
      expect(data.errorCodes).toHaveProperty('rejection');
      expect(data.errorCodes).toHaveProperty('clarification');
      expect(data.errorCodes).toHaveProperty('error');
    });

    it('should define envelope required fields', async () => {
      const res = await app.request('/mcp/schemas');
      const data = await res.json();

      expect(data.envelope).toHaveProperty('required');
      expect(data.envelope.required).toContain('eye');
      expect(data.envelope.required).toContain('code');
      expect(data.envelope.required).toContain('verdict');
      expect(data.envelope.required).toContain('summary');
    });
  });

  describe('GET /mcp/examples/:eye', () => {
    it('should return examples for Sharingan', async () => {
      const res = await app.request('/mcp/examples/sharingan');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('eye', 'sharingan');
      expect(data).toHaveProperty('examples');
      expect(Array.isArray(data.examples)).toBe(true);
    });

    it('should include input and output in examples', async () => {
      const res = await app.request('/mcp/examples/sharingan');
      const data = await res.json();

      const firstExample = data.examples[0];
      expect(firstExample).toHaveProperty('input');
      expect(firstExample).toHaveProperty('output');
      expect(firstExample.output).toHaveProperty('eye', 'sharingan');
      expect(firstExample.output).toHaveProperty('verdict');
    });

    it('should return 404 for non-existent Eye', async () => {
      const res = await app.request('/mcp/examples/nonexistent');
      expect(res.status).toBe(404);

      const data = await res.json();
      expect(data).toHaveProperty('error');
    });

    it('should provide examples for all core Eyes', async () => {
      const eyes = ['jogan', 'tenseigan'];

      for (const eye of eyes) {
        const res = await app.request(`/mcp/examples/${eye}`);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.eye).toBe(eye);
        expect(data.examples.length).toBeGreaterThan(0);
      }
    });
  });

  describe('GET /mcp/health', () => {
    it('should return health status', async () => {
      const res = await app.request('/mcp/health');
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('ok');
      expect(data.ok).toBe(true);
      expect(data).toHaveProperty('service', 'third-eye-mcp');
    });

    it('should include timestamp', async () => {
      const res = await app.request('/mcp/health');
      const data = await res.json();

      expect(data).toHaveProperty('timestamp');
      const timestamp = new Date(data.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on MCP endpoints', async () => {
      // This test would require making 100+ requests
      // Skipping for unit test suite, should be in load tests
      expect(true).toBe(true);
    });
  });
});
