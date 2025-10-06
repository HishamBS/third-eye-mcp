import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { getConfig, loadConfig } from '../index';

describe('Config Loading', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  test('should load config with default values', () => {
    const config = getConfig();

    expect(config).toBeDefined();
    expect(config.server).toBeDefined();
    expect(config.ui).toBeDefined();
    expect(config.database).toBeDefined();
  });

  test('should use environment variables when available', () => {
    process.env.OVERSEER_HOST = '0.0.0.0';
    process.env.OVERSEER_PORT = '8080';
    process.env.OVERSEER_UI_PORT = '4000';

    const config = loadConfig();

    expect(config.server.host).toBe('0.0.0.0');
    expect(config.server.port).toBe(8080);
    expect(config.ui.port).toBe(4000);
  });

  test('should use default host when not specified', () => {
    delete process.env.OVERSEER_HOST;

    const config = loadConfig();

    expect(config.server.host).toBe('127.0.0.1');
  });

  test('should use default port when not specified', () => {
    delete process.env.OVERSEER_PORT;

    const config = loadConfig();

    expect(config.server.port).toBe(7070);
  });

  test('should parse boolean autoOpen correctly', () => {
    process.env.AUTO_OPEN = 'true';
    let config = loadConfig();
    expect(config.ui.autoOpen).toBe(true);

    process.env.AUTO_OPEN = 'false';
    config = loadConfig();
    expect(config.ui.autoOpen).toBe(false);

    process.env.AUTO_OPEN = '1';
    config = loadConfig();
    expect(config.ui.autoOpen).toBe(true);

    process.env.AUTO_OPEN = '0';
    config = loadConfig();
    expect(config.ui.autoOpen).toBe(false);
  });

  test('should handle database path configuration', () => {
    const testDbPath = '/tmp/test.db';
    process.env.OVERSEER_DB = testDbPath;

    const config = loadConfig();

    expect(config.database.path).toBe(testDbPath);
  });

  test('should provide default database path', () => {
    delete process.env.OVERSEER_DB;

    const config = loadConfig();

    expect(config.database.path).toContain('.overseer');
    expect(config.database.path).toContain('overseer.db');
  });
});

describe('Config Validation', () => {
  test('should have valid server config', () => {
    const config = getConfig();

    expect(config.server.host).toBeTruthy();
    expect(config.server.port).toBeGreaterThan(0);
    expect(config.server.port).toBeLessThan(65536);
  });

  test('should have valid UI config', () => {
    const config = getConfig();

    expect(config.ui.port).toBeGreaterThan(0);
    expect(config.ui.port).toBeLessThan(65536);
    expect(typeof config.ui.autoOpen).toBe('boolean');
  });

  test('should have valid database config', () => {
    const config = getConfig();

    expect(config.database.path).toBeTruthy();
    expect(typeof config.database.path).toBe('string');
  });
});

describe('Provider Configuration', () => {
  test('should configure Groq provider', () => {
    process.env.GROQ_API_KEY = 'test-groq-key';
    process.env.GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

    const config = loadConfig();

    expect(config.providers?.groq?.apiKey).toBe('test-groq-key');
    expect(config.providers?.groq?.baseUrl).toBe('https://api.groq.com/openai/v1');
  });

  test('should configure OpenRouter provider', () => {
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

    const config = loadConfig();

    expect(config.providers?.openrouter?.apiKey).toBe('test-openrouter-key');
    expect(config.providers?.openrouter?.baseUrl).toBe('https://openrouter.ai/api/v1');
  });

  test('should configure Ollama provider', () => {
    process.env.OLLAMA_BASE_URL = 'http://localhost:11434';

    const config = loadConfig();

    expect(config.providers?.ollama?.baseUrl).toBe('http://localhost:11434');
  });

  test('should configure LM Studio provider', () => {
    process.env.LMSTUDIO_BASE_URL = 'http://localhost:1234/v1';

    const config = loadConfig();

    expect(config.providers?.lmstudio?.baseUrl).toBe('http://localhost:1234/v1');
  });
});

describe('Security Configuration', () => {
  test('should load encryption key when provided', () => {
    const testKey = 'a'.repeat(64); // 64-character hex key
    process.env.THIRD_EYE_SECURITY_ENCRYPTION_KEY = testKey;

    const config = loadConfig();

    expect(config.security?.encryptionKey).toBe(testKey);
  });

  test('should handle missing encryption key gracefully', () => {
    delete process.env.THIRD_EYE_SECURITY_ENCRYPTION_KEY;

    const config = loadConfig();

    // Should either be undefined or have a default
    expect(config.security?.encryptionKey).toBeDefined();
  });
});

describe('Telemetry Configuration', () => {
  test('should respect telemetry opt-in', () => {
    process.env.TELEMETRY_ENABLED = 'true';

    const config = loadConfig();

    expect(config.telemetry?.enabled).toBe(true);
  });

  test('should default telemetry to false', () => {
    delete process.env.TELEMETRY_ENABLED;

    const config = loadConfig();

    expect(config.telemetry?.enabled).toBe(false);
  });
});

describe('Rate Limiting Configuration', () => {
  test('should configure rate limits', () => {
    process.env.RATE_LIMIT_USER_RPS = '5';
    process.env.RATE_LIMIT_SESSION_RPS = '10';

    const config = loadConfig();

    expect(config.rateLimits?.userRps).toBe(5);
    expect(config.rateLimits?.sessionRps).toBe(10);
  });

  test('should use default rate limits', () => {
    delete process.env.RATE_LIMIT_USER_RPS;
    delete process.env.RATE_LIMIT_SESSION_RPS;

    const config = loadConfig();

    expect(config.rateLimits?.userRps).toBeGreaterThan(0);
    expect(config.rateLimits?.sessionRps).toBeGreaterThan(0);
  });
});
