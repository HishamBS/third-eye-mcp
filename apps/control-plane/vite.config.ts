/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { InlineConfig } from 'vitest';

const testConfig: InlineConfig = {
  globals: true,
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
};

export default defineConfig({
  plugins: [react()],
  test: testConfig,
} as any);
