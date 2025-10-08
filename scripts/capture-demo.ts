#!/usr/bin/env bun

import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { chromium } from 'playwright';

const HOST = process.env.MCP_HOST || '127.0.0.1';
const UI_PORT = process.env.MCP_UI_PORT || '3300';
const BASE_URL = process.env.MCP_DEMO_URL || `http://${HOST}:${UI_PORT}`;
const OUTPUT_DIR = resolve(process.cwd(), 'docs', 'assets');

async function ensureDir(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

async function capture() {
  await ensureDir(OUTPUT_DIR);

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  console.log(`📸 Capturing demo assets from ${BASE_URL}`);

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(OUTPUT_DIR, 'dashboard.png'), fullPage: true });
  console.log('   ✓ Saved dashboard.png');

  // Monitor view (adjust selector if route changes)
  await page.goto(`${BASE_URL}/monitor`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: resolve(OUTPUT_DIR, 'monitor.png'), fullPage: true });
  console.log('   ✓ Saved monitor.png');

  await browser.close();
  console.log('✅ Demo asset capture complete.');
}

capture().catch((error) => {
  console.error('❌ Failed to capture demo assets:', error instanceof Error ? error.message : error);
  process.exit(1);
});
