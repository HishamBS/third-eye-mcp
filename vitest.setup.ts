import { beforeAll, afterAll, beforeEach } from 'vitest';
import { existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';

// Use a test-specific database
const TEST_DB_PATH = resolve(tmpdir(), 'third-eye-test.db');

beforeAll(() => {
  // Set test environment variables
  process.env.MCP_DB = TEST_DB_PATH;
  process.env.NODE_ENV = 'test';
});

beforeEach(() => {
  // Clean up database before each test
  if (existsSync(TEST_DB_PATH)) {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch (error) {
      console.warn('Failed to delete test database:', error);
    }
  }
});

afterAll(() => {
  // Clean up after all tests
  if (existsSync(TEST_DB_PATH)) {
    try {
      unlinkSync(TEST_DB_PATH);
    } catch (error) {
      console.warn('Failed to clean up test database:', error);
    }
  }
  delete process.env.MCP_DB;
});
