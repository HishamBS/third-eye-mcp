#!/usr/bin/env bun
/**
 * Production Build Script for Third Eye MCP Server
 *
 * Bundles the server into a single executable for production deployment
 */

import { build } from 'bun';
import { resolve } from 'path';
import { existsSync, rmSync } from 'fs';

const ROOT = resolve(import.meta.dir, '../../..');
const SERVER_DIR = resolve(ROOT, 'apps/server');
const DIST_DIR = resolve(SERVER_DIR, 'dist');
const ENTRY = resolve(SERVER_DIR, 'src/index.ts');

console.log('🔨 Building Third Eye MCP Server...');
console.log(`   Entry: ${ENTRY}`);
console.log(`   Output: ${DIST_DIR}`);

// Clean dist directory
if (existsSync(DIST_DIR)) {
  console.log('🧹 Cleaning dist directory...');
  rmSync(DIST_DIR, { recursive: true, force: true });
}

try {
  const result = await build({
    entrypoints: [ENTRY],
    outdir: DIST_DIR,
    target: 'bun',
    format: 'esm',
    minify: {
      whitespace: true,
      identifiers: false,
      syntax: true,
    },
    sourcemap: 'external',
    splitting: true,
    external: [
      // External dependencies that should not be bundled
      'better-sqlite3',
      '@neondatabase/serverless',
      'ws',
    ],
  });

  if (result.success) {
    console.log('✅ Server build completed successfully!');
    console.log(`   Output: ${DIST_DIR}/index.js`);
    console.log(`   Sourcemap: ${DIST_DIR}/index.js.map`);

    // Display build artifacts
    const { readdirSync, statSync } = await import('fs');
    const files = readdirSync(DIST_DIR);
    console.log('\n📦 Build artifacts:');
    files.forEach(file => {
      const filePath = resolve(DIST_DIR, file);
      const stats = statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`   - ${file} (${sizeKB} KB)`);
    });
  } else {
    console.error('❌ Build failed');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Build error:', error);
  process.exit(1);
}
