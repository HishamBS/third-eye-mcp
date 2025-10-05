#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const execFileAsync = promisify(execFile);

const BASE_URL = process.env.LIGHTHOUSE_URL ?? 'http://127.0.0.1:4173/session/session-1';
const OUTPUT_DIR = process.env.LIGHTHOUSE_OUTPUT_DIR ?? resolve('lighthouse');
const OUTPUT_PATH = resolve(OUTPUT_DIR, 'monitor-report.html');

async function run() {
  const args = [
    BASE_URL,
    '--quiet',
    '--chrome-flags=--headless=new',
    '--preset=desktop',
    '--output=html',
    `--output-path=${OUTPUT_PATH}`,
  ];

  try {
    await execFileAsync('lighthouse', args, { stdio: 'inherit' });
    console.log(`Lighthouse report written to ${OUTPUT_PATH}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('Unable to locate the `lighthouse` binary. Run `pnpm --filter overseer-dashboard install` to ensure devDependencies are installed.');
    } else {
      console.error('Lighthouse audit failed:', error.message ?? error);
    }
    process.exitCode = 1;
  }
}

run();
