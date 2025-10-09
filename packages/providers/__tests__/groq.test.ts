import { describe, test, expect, beforeAll } from 'vitest';
import { GroqProvider } from '../groq';
import type { CompletionRequest } from '@third-eye/types';

describe('GroqProvider', () => {
  let provider: GroqProvider;

  beforeAll(() => {
    // Use mock API key for testing
    provider = new GroqProvider(
      'https://api.groq.com/openai/v1',
      process.env.GROQ_API_KEY || 'mock-key'
    );
  });

  test('should create provider instance', () => {
    expect(provider).toBeDefined();
    expect(provider).toBeInstanceOf(GroqProvider);
  });

  test('should have required methods', () => {
    expect(provider.listModels).toBeDefined();
    expect(provider.complete).toBeDefined();
    expect(provider.health).toBeDefined();
    expect(typeof provider.listModels).toBe('function');
    expect(typeof provider.complete).toBe('function');
    expect(typeof provider.health).toBe('function');
  });

  test('should list models with valid API key', async () => {
    if (!process.env.GROQ_API_KEY) {
      console.log('⏭️  Skipping Groq listModels test (no API key)');
      return;
    }

    const models = await provider.listModels();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);

    // Check model structure
    const model = models[0];
    expect(model).toHaveProperty('name');
    expect(typeof model.name).toBe('string');
  });

  test('should complete request with valid API key', async () => {
    if (!process.env.GROQ_API_KEY) {
      console.log('⏭️  Skipping Groq complete test (no API key)');
      return;
    }

    const request: CompletionRequest = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'user', content: 'Say "test successful" and nothing else.' }
      ],
      temperature: 0.1,
      maxTokens: 10
    };

    const response = await provider.complete(request);

    expect(response).toHaveProperty('output');
    expect(typeof response.output).toBe('string');
    expect(response.output.length).toBeGreaterThan(0);
    expect(response).toHaveProperty('usage');
    expect(response.usage).toHaveProperty('promptTokens');
    expect(response.usage).toHaveProperty('completionTokens');
  });

  test('should check health with valid API key', async () => {
    if (!process.env.GROQ_API_KEY) {
      console.log('⏭️  Skipping Groq health test (no API key)');
      return;
    }

    const health = await provider.health();

    expect(health).toHaveProperty('status');
    expect(health.status).toBe('ok');
  });

  test('should handle invalid API key gracefully', async () => {
    const badProvider = new GroqProvider(
      'https://api.groq.com/openai/v1',
      'invalid-key-12345'
    );

    await expect(badProvider.listModels()).rejects.toThrow();
  });

  test('should validate completion request structure', async () => {
    if (!process.env.GROQ_API_KEY) {
      console.log('⏭️  Skipping Groq validation test (no API key)');
      return;
    }

    // Missing model
    const invalidRequest: any = {
      messages: [{ role: 'user', content: 'test' }]
    };

    await expect(provider.complete(invalidRequest)).rejects.toThrow();
  });

  describe('JSON Mode Enforcement', () => {
    test('should include response_format in request when specified', async () => {
      if (!process.env.GROQ_API_KEY) {
        console.log('⏭️  Skipping Groq JSON mode test (no API key)');
        return;
      }

      const request: CompletionRequest = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: 'Return a JSON object with a "status" field set to "success"' }
        ],
        temperature: 0.1,
        maxTokens: 50,
        response_format: { type: 'json_object' }
      };

      const response = await provider.complete(request);

      expect(response).toHaveProperty('output');
      expect(typeof response.output).toBe('string');

      // Response should be valid JSON
      expect(() => JSON.parse(response.output)).not.toThrow();

      const parsed = JSON.parse(response.output);
      expect(parsed).toHaveProperty('status');
    });

    test('should enforce JSON mode for structured outputs', async () => {
      if (!process.env.GROQ_API_KEY) {
        console.log('⏭️  Skipping Groq JSON enforcement test (no API key)');
        return;
      }

      const request: CompletionRequest = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You must respond with valid JSON only. Return an object with "message" and "timestamp" fields.'
          },
          { role: 'user', content: 'Hello' }
        ],
        temperature: 0.1,
        maxTokens: 100,
        response_format: { type: 'json_object' }
      };

      const response = await provider.complete(request);

      // Verify response is valid JSON
      let parsed: any;
      expect(() => {
        parsed = JSON.parse(response.output);
      }).not.toThrow();

      // Verify structure
      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe('object');
    });

    test('should handle JSON mode with complex schemas', async () => {
      if (!process.env.GROQ_API_KEY) {
        console.log('⏭️  Skipping Groq complex JSON test (no API key)');
        return;
      }

      const request: CompletionRequest = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Return a JSON object with: ok (boolean), code (string), md (string), data (object), next (string)'
          },
          { role: 'user', content: 'Analyze this simple request' }
        ],
        temperature: 0.1,
        maxTokens: 200,
        response_format: { type: 'json_object' }
      };

      const response = await provider.complete(request);

      // Parse and validate
      const parsed = JSON.parse(response.output);
      expect(parsed).toBeDefined();
      expect(typeof parsed).toBe('object');

      // Should have some of the requested fields
      expect(parsed).toHaveProperty('ok');
      expect(parsed).toHaveProperty('code');
    });

    test('should work without JSON mode when not specified', async () => {
      if (!process.env.GROQ_API_KEY) {
        console.log('⏭️  Skipping Groq non-JSON test (no API key)');
        return;
      }

      const request: CompletionRequest = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: 'Say "hello" in plain text' }
        ],
        temperature: 0.1,
        maxTokens: 10
        // No response_format specified
      };

      const response = await provider.complete(request);

      expect(response).toHaveProperty('output');
      expect(typeof response.output).toBe('string');
      expect(response.output.length).toBeGreaterThan(0);
    });

    test('should pass response_format to API correctly', async () => {
      if (!process.env.GROQ_API_KEY) {
        console.log('⏭️  Skipping Groq response_format passthrough test (no API key)');
        return;
      }

      // Mock fetch to intercept the request
      const originalFetch = global.fetch;
      let capturedBody: any = null;

      try {
        global.fetch = async (url: any, options: any) => {
          if (options?.body) {
            capturedBody = JSON.parse(options.body);
          }
          return originalFetch(url, options);
        };

        const request: CompletionRequest = {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'user', content: 'Return JSON with status=ok' }
          ],
          temperature: 0.1,
          maxTokens: 50,
          response_format: { type: 'json_object' }
        };

        await provider.complete(request);

        // Verify response_format was included in the request body
        expect(capturedBody).toBeDefined();
        expect(capturedBody.response_format).toBeDefined();
        expect(capturedBody.response_format.type).toBe('json_object');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
