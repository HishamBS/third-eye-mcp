import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.next/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        'apps/ui/**', // Next.js app tested with Playwright
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'build', '.next'],
    poolOptions: {
      threads: {
        singleThread: true, // Run E2E tests in single thread for MCP stdio
      },
    },
  },
  resolve: {
    alias: {
      '@third-eye/core': resolve(__dirname, './packages/core'),
      '@third-eye/providers': resolve(__dirname, './packages/providers'),
      '@third-eye/db': resolve(__dirname, './packages/db'),
      '@third-eye/config': resolve(__dirname, './packages/config'),
      '@third-eye/types': resolve(__dirname, './packages/types'),
      '@third-eye/eyes': resolve(__dirname, './packages/eyes'),
      '@third-eye/mcp': resolve(__dirname, './packages/mcp'),
      'bun:sqlite': resolve(__dirname, './packages/db/__mocks__/bun-sqlite.ts'),
    },
    conditions: ['node', 'import', 'module', 'browser', 'default'],
  },
});
