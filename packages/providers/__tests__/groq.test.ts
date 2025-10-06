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
});
