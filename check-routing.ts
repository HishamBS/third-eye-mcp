#!/usr/bin/env bun
import { getDb } from './packages/db/index';

const { db } = getDb();
const { eyesRouting } = await import('./packages/db/schema');

try {
  const routing = await db.select().from(eyesRouting);
  console.log('📋 Routing configuration entries:', routing.length);

  if (routing.length === 0) {
    console.log('⚠️  No routing configuration found. Need to seed with migration 0004.');
  } else {
    console.log('✅ Routing configuration exists:');
    routing.forEach(r => {
      console.log(`   ${r.eye}: ${r.primaryProvider}/${r.primaryModel}`);
    });
  }
} catch (error) {
  console.error('❌ Failed to check routing:', error);
}