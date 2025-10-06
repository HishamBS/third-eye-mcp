import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { nanoid } from 'nanoid';

/**
 * API Integration Tests
 *
 * Tests the HTTP API endpoints end-to-end
 */

const API_BASE = process.env.API_URL || 'http://127.0.0.1:7070';

describe('Sessions API', () => {
  let testSessionId: string;

  test('POST /sessions should create a new session', async () => {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { test: 'value' } }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(data).toHaveProperty('sessionId');
    expect(data).toHaveProperty('portalUrl');
    expect(data).toHaveProperty('session');

    testSessionId = data.sessionId;
  });

  test('GET /sessions should list all sessions', async () => {
    const response = await fetch(`${API_BASE}/sessions`);

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(data).toHaveProperty('sessions');
    expect(Array.isArray(data.sessions)).toBe(true);
    expect(data.sessions.length).toBeGreaterThan(0);
  });

  test('GET /sessions/:id should retrieve a specific session', async () => {
    const response = await fetch(`${API_BASE}/sessions/${testSessionId}`);

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(data.id).toBe(testSessionId);
    expect(data).toHaveProperty('status');
  });

  test('PATCH /sessions/:id/status should update session status', async () => {
    const response = await fetch(`${API_BASE}/sessions/${testSessionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(data.status).toBe('completed');
  });

  test('GET /sessions/:id/summary should return session summary', async () => {
    const response = await fetch(`${API_BASE}/sessions/${testSessionId}/summary`);

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(data).toHaveProperty('sessionId');
    expect(data).toHaveProperty('eventCount');
    expect(data).toHaveProperty('eyes');
  });
});

describe('Personas API', () => {
  test('GET /personas should list all personas', async () => {
    const response = await fetch(`${API_BASE}/personas`);

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
  });

  test('POST /personas/:eye should create new persona version', async () => {
    const response = await fetch(`${API_BASE}/personas/test-eye`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Test persona content',
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(data).toHaveProperty('eye', 'test-eye');
    expect(data).toHaveProperty('version');
  });

  test('GET /personas/:eye/active should return active persona', async () => {
    const response = await fetch(`${API_BASE}/personas/test-eye/active`);

    if (response.ok) {
      const data = await response.json();
      expect(data).toHaveProperty('active', true);
    } else {
      // No active persona is also valid
      expect(response.status).toBe(404);
    }
  });
});

describe('Routing API', () => {
  test('GET /routing should list all routing configurations', async () => {
    const response = await fetch(`${API_BASE}/routing`);

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
  });

  test('POST /routing should create routing configuration', async () => {
    const response = await fetch(`${API_BASE}/routing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eye: 'test-routing-eye',
        primaryProvider: 'groq',
        primaryModel: 'llama-3.3-70b-versatile',
        fallbackProvider: 'openrouter',
        fallbackModel: 'anthropic/claude-3.5-sonnet',
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(data).toHaveProperty('eye', 'test-routing-eye');
    expect(data).toHaveProperty('primaryProvider', 'groq');
  });

  test('PUT /routing/:eye should update routing configuration', async () => {
    const response = await fetch(`${API_BASE}/routing/test-routing-eye`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        primaryProvider: 'ollama',
        primaryModel: 'llama3.1:8b',
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(data.primaryProvider).toBe('ollama');
  });
});

describe('Strictness API', () => {
  test('GET /strictness should list all profiles', async () => {
    const response = await fetch(`${API_BASE}/strictness`);

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
  });

  test('POST /strictness should create custom profile', async () => {
    const response = await fetch(`${API_BASE}/strictness`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'test-profile',
        sharinganMinScore: 75,
        rinneganRequireTests: true,
        tenseiganMinConfidence: 0.8,
        byakuganAllowPartial: false,
        mangekyoStrictness: 'strict',
        joganRequireEvidence: true,
        overseerMinApprovals: 5,
        custom: false,
        createdAt: new Date(),
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(data).toHaveProperty('name', 'test-profile');
  });
});

describe('Models API', () => {
  test('GET /models should list cached models', async () => {
    const response = await fetch(`${API_BASE}/models`);

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(data).toHaveProperty('models');
    expect(Array.isArray(data.models)).toBe(true);
  });

  test('GET /models/:provider should list provider models', async () => {
    const response = await fetch(`${API_BASE}/models/groq`);

    if (response.ok) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    } else {
      // Provider not configured is valid
      expect(response.status).toBe(404);
    }
  });
});

describe('Pipelines API', () => {
  test('GET /pipelines should list all pipelines', async () => {
    const response = await fetch(`${API_BASE}/pipelines`);

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(Array.isArray(data)).toBe(true);
  });

  test('POST /pipelines should create new pipeline', async () => {
    const response = await fetch(`${API_BASE}/pipelines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'test-pipeline',
        version: 1,
        steps: ['sharingan', 'rinnegan', 'tenseigan'],
        active: true,
        createdAt: new Date(),
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(data).toHaveProperty('name', 'test-pipeline');
    expect(data.steps).toHaveLength(3);
  });
});

describe('Error Handling', () => {
  test('should return 404 for non-existent session', async () => {
    const response = await fetch(`${API_BASE}/sessions/nonexistent-id`);

    expect(response.status).toBe(404);
    const data = await response.json();

    expect(data).toHaveProperty('error');
  });

  test('should return 400 for invalid status update', async () => {
    // Create a session first
    const createResponse = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const { sessionId } = await createResponse.json();

    const response = await fetch(`${API_BASE}/sessions/${sessionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid-status' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();

    expect(data).toHaveProperty('error');
  });

  test('should handle malformed JSON gracefully', async () => {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid json }',
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});

describe('Health & Status', () => {
  test('GET /health should return server health', async () => {
    const response = await fetch(`${API_BASE}/health`);

    expect(response.ok).toBe(true);
    const data = await response.json();

    expect(data).toHaveProperty('status');
  });
});
