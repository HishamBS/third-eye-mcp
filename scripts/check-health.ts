#!/usr/bin/env bun

import { setTimeout } from 'timers/promises';

const HOST = process.env.MCP_HOST || '127.0.0.1';
const PORT = process.env.MCP_PORT || '7070';
const endpoint = process.env.MCP_HEALTH_URL || `http://${HOST}:${PORT}/health`;

async function main() {
  console.log(`🔍 Checking Third Eye MCP health at ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json',
      },
    });

    const body = await response.json();

    console.log(`
Status : ${response.status} ${response.statusText}`);
    console.log(`OK     : ${body.ok}`);
    console.log(`Version: ${body.version}`);
    console.log(`Uptime : ${body.uptime_seconds}s`);
    console.log(`Status : ${body.status}`);

    if (body.checks) {
      console.log('\nChecks:');
      if (body.checks.database) {
        console.log(`  • database : ${body.checks.database.ok ? 'ok' : 'fail'} (${body.checks.database.latency_ms ?? 'n/a'} ms)`);
      }
      if (body.checks.providers) {
        for (const [provider, value] of Object.entries(body.checks.providers as Record<string, boolean>)) {
          console.log(`  • provider ${provider.padEnd(10)}: ${value ? 'ok' : 'fail'}`);
        }
      }
    }

    if (!body.ok) {
      console.error('\n❌ Health check reports degraded or down status.');
      process.exit(1);
    }

    console.log('\n✅ Health check passed.');
  } catch (error) {
    console.error('\n❌ Failed to fetch health endpoint:', error instanceof Error ? error.message : error);
    console.error('   Ensure the server is running (pnpm dev) before executing this script.');
    process.exit(1);
  }
}

await main();
