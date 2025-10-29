#!/usr/bin/env bun
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('__dirname:', __dirname);
console.log('Current file:', __filename);

// Test different migration path resolutions
const testPaths = [
  resolve(__dirname, 'migrations'),
  resolve(process.cwd(), 'packages/db/migrations'),
];

for (const path of testPaths) {
  console.log(`Testing: ${path}`);
  console.log(`Exists: ${existsSync(path)}`);
  if (existsSync(path)) {
    const { readdir } = await import('fs/promises');
    const files = await readdir(path);
    console.log(`Files: ${files.join(', ')}`);
  }
}

