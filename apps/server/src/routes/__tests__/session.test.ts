import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';

describe('Session Endpoints Integration Tests', () => {
  let app: Hono;
  let testSessionId: string;

  beforeEach(async () => {
    // Import session routes
    const sessionRoutes = await import('../session');
    app = new Hono();
    app.route('/sessions', sessionRoutes.default);
  });

  describe('POST /sessions', () => {
    it('should create a new session', async () => {
      const res = await app.request('/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { userIntent: 'test' } }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('sessionId');
      expect(data).toHaveProperty('session');

      testSessionId = data.sessionId;
    });

    it('should create session without config', async () => {
      const res = await app.request('/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('sessionId');
    });

    it('should include portal URL', async () => {
      const res = await app.request('/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      expect(data).toHaveProperty('portalUrl');
      expect(data.portalUrl).toContain('/session/');
    });
  });

  describe('Context Management', () => {
    it('should add context to session', async () => {
      const contextData = {
        source: 'user',
        key: 'projectName',
        value: 'Third Eye MCP',
      };

      const res = await app.request(`/sessions/${testSessionId}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contextData),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('context');
      expect(data.context).toHaveProperty('projectName');
    });

    it('should retrieve session context', async () => {
      const res = await app.request(`/sessions/${testSessionId}/context`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('sessionId', testSessionId);
      expect(data).toHaveProperty('context');
    });

    it('should remove context item', async () => {
      const res = await app.request(`/sessions/${testSessionId}/context/projectName`, {
        method: 'DELETE',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.context).not.toHaveProperty('projectName');
    });

    it('should validate context source', async () => {
      const invalidContext = {
        source: 'invalid',
        key: 'test',
        value: 'value',
      };

      const res = await app.request(`/sessions/${testSessionId}/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidContext),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('Clarification Validation', () => {
    it('should validate clarification answer', async () => {
      const clarificationId = 'clarif-123';
      const answer = 'I want to implement user authentication';

      const res = await app.request(
        `/sessions/${testSessionId}/clarifications/${clarificationId}/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer }),
        }
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('valid');
      expect(data).toHaveProperty('clarificationId', clarificationId);
    });

    it('should reject too short answers', async () => {
      const res = await app.request(
        `/sessions/${testSessionId}/clarifications/test/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: 'no' }),
        }
      );

      const data = await res.json();
      expect(data.valid).toBe(false);
      expect(data).toHaveProperty('reason');
    });

    it('should require answer field', async () => {
      const res = await app.request(
        `/sessions/${testSessionId}/clarifications/test/validate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      expect(res.status).toBe(400);
    });
  });

  describe('Session Export', () => {
    it('should export session as JSON', async () => {
      const res = await app.request(`/sessions/${testSessionId}/export?format=json`);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/json');

      const data = await res.json();
      expect(data).toHaveProperty('session');
      expect(data).toHaveProperty('runs');
      expect(data).toHaveProperty('events');
      expect(data).toHaveProperty('exportedAt');
    });

    it('should export session as Markdown', async () => {
      const res = await app.request(`/sessions/${testSessionId}/export?format=md`);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/markdown');

      const text = await res.text();
      expect(text).toContain(`# Session ${testSessionId}`);
      expect(text).toContain('## Timeline');
    });

    it('should export session as CSV', async () => {
      const res = await app.request(`/sessions/${testSessionId}/export?format=csv`);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('text/csv');

      const text = await res.text();
      expect(text).toContain('eye,model,latency_ms');
    });

    it('should reject invalid export format', async () => {
      const res = await app.request(`/sessions/${testSessionId}/export?format=invalid`);
      expect(res.status).toBe(400);
    });

    it('should default to JSON format', async () => {
      const res = await app.request(`/sessions/${testSessionId}/export`);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toContain('application/json');
    });
  });

  describe('Kill Switch', () => {
    it('should kill session and stop Eyes', async () => {
      const res = await app.request(`/sessions/${testSessionId}/kill`, {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('status', 'killed');
      expect(data).toHaveProperty('stoppedEyes');
      expect(Array.isArray(data.stoppedEyes)).toBe(true);
    });

    it('should reject killing already killed session', async () => {
      // Try to kill again
      const res = await app.request(`/sessions/${testSessionId}/kill`, {
        method: 'POST',
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('already killed');
    });

    it('should return 404 for non-existent session', async () => {
      const res = await app.request(`/sessions/nonexistent/kill`, {
        method: 'POST',
      });

      expect(res.status).toBe(404);
    });
  });

  describe('Session Queries', () => {
    it('should get session by ID', async () => {
      const res = await app.request(`/sessions/${testSessionId}`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('id', testSessionId);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('createdAt');
    });

    it('should get session runs', async () => {
      const res = await app.request(`/sessions/${testSessionId}/runs`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('sessionId', testSessionId);
      expect(data).toHaveProperty('runs');
      expect(Array.isArray(data.runs)).toBe(true);
    });

    it('should get session events', async () => {
      const res = await app.request(`/sessions/${testSessionId}/events`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it('should get session summary', async () => {
      const res = await app.request(`/sessions/${testSessionId}/summary`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('sessionId', testSessionId);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('eventCount');
      expect(data).toHaveProperty('eyes');
    });
  });

  describe('Pagination', () => {
    it('should paginate session runs', async () => {
      const res = await app.request(`/sessions/${testSessionId}/runs?limit=10&offset=0`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveProperty('limit', 10);
      expect(data).toHaveProperty('offset', 0);
    });

    it('should paginate session events', async () => {
      const res = await app.request(`/sessions/${testSessionId}/events?limit=50&offset=0`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
