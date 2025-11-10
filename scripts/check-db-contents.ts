import { getDb, schema } from '@third-eye/db';

const { db } = getDb();

// Check blueprints
const allBlueprints = await db.select().from(schema.blueprints).all();
console.log('\n📋 Blueprints in database:', allBlueprints.length);
for (const bp of allBlueprints) {
  console.log(`  - ${bp.id}: ${bp.name} (eyeTag: ${bp.eyeTag})`);
}

// Check eyes
const allEyes = await db.select().from(schema.eyes).all();
console.log('\n👁️  Eyes in database:', allEyes.length);
for (const eye of allEyes) {
  console.log(`  - ${eye.id}: ${eye.name} (tag: ${eye.tag}, active: ${eye.isActive})`);
}
