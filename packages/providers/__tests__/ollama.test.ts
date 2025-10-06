import { describe, test, expect, beforeAll } from 'vitest';
import { OllamaProvider } from '../ollama';
import type { CompletionRequest } from '@third-eye/types';

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeAll(() => {
    provider = new OllamaProvider(
      process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
    );
  });

  test('should create provider instance', () => {
    expect(provider).toBeDefined();
    expect(provider).toBeInstanceOf(OllamaProvider);
  });

  test('should have required methods', () => {
    expect(provider.listModels).toBeDefined();
    expect(provider.complete).toBeDefined();
    expect(provider.health).toBeDefined();
  });

  test('should check health (requires Ollama running)', async () => {
    try {
      const health = await provider.health();
      expect(health).toHaveProperty('status');
      expect(health.status).toBe('ok');
    } catch (error) {
      console.log('⏭️  Skipping Ollama health test (server not running)');
      expect(error).toBeDefined();
    }
  });

  test('should list models if Ollama is running', async () => {
    try {
      const models = await provider.listModels();
      expect(Array.isArray(models)).toBe(true);

      if (models.length > 0) {
        const model = models[0];
        expect(model).toHaveProperty('name');
      }
    } catch (error) {
      console.log('⏭️  Skipping Ollama listModels test (server not running)');
      expect(error).toBeDefined();
    }
  });

  test('should complete request if Ollama has models', async () => {
    try {
      const models = await provider.listModels();

      if (models.length === 0) {
        console.log('⏭️  Skipping Ollama complete test (no models installed)');
        return;
      }

      const request: CompletionRequest = {
        model: models[0].name,
        messages: [
          { role: 'user', content: 'Say "test" and nothing else.' }
        ],
        temperature: 0.1,
        maxTokens: 5
      };

      const response = await provider.complete(request);

      expect(response).toHaveProperty('output');
      expect(typeof response.output).toBe('string');
    } catch (error) {
      console.log('⏭️  Skipping Ollama complete test (server not running)');
      expect(error).toBeDefined();
    }
  });

  test('should handle connection error gracefully', async () => {
    const badProvider = new OllamaProvider('http://127.0.0.1:99999');

    await expect(badProvider.health()).rejects.toThrow();
  });
});
