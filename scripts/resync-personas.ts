#!/usr/bin/env bun

/**
 * Persona Re-Sync Script
 *
 * Force-updates all personas in database to match TypeScript Eye definitions
 * Replaces version 1 with latest persona content including new UI field
 */

import { seedDefaults } from '../packages/db/defaults';

async function resyncPersonas() {
  console.log('🔄 Re-syncing personas to default catalog...\n');
  await seedDefaults({
    force: true,
    subsets: { personas: true },
    log: (message) => console.log(message),
  });
}

if (import.meta.main) {
  resyncPersonas()
    .then(() => {
      console.log('\n🎉 Persona re-sync successful!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Re-sync failed:', error);
      process.exit(1);
    });
}

export { resyncPersonas };
