/**
 * Quick verification script to ensure transformed Eyes are working
 */

import { getEye } from '@third-eye/eyes';
import { getDb, closeDb, personas } from '@third-eye/db';
import { eq, and } from 'drizzle-orm';

console.log('🔍 Verifying Transformed Eyes...\n');

const eyeNames = ['overseer', 'sharingan', 'prompt-helper', 'jogan', 'rinnegan', 'mangekyo', 'tenseigan', 'byakugan'] as const;

let allPassed = true;

const { db } = getDb();

async function loadActivePersona(eyeName: typeof eyeNames[number]): Promise<string> {
  const record = await db
    .select()
    .from(personas)
    .where(and(eq(personas.eye, eyeName), eq(personas.active, true)))
    .get();

  if (!record) {
    throw new Error(
      `No active persona found in database. Run 'bun run scripts/seed-defaults.ts --only=personas' to restore defaults.`
    );
  }

  return record.content;
}

async function main() {
  for (const name of eyeNames) {
    try {
      const eye = getEye(name);

      if (!eye) {
        console.log(`❌ ${name.padEnd(15)} - FAILED: Eye not registered`);
        allPassed = false;
        continue;
      }

      const persona = await loadActivePersona(name);

      // Check for two-phase operation keywords in persona (except overseer and byakugan)
      const hasTwoPhase = persona.includes('GUIDANCE') || persona.includes('VALIDATION') || name === 'overseer' || name === 'byakugan';

      // Check for UI field mention in persona
      const hasUIField = persona.includes('"ui"') || persona.includes('ui:');

      console.log(`✅ ${name.padEnd(15)} - loaded successfully`);

      if (!hasTwoPhase && name !== 'overseer') {
        console.log(`   ⚠️  Missing GUIDANCE/VALIDATION phases`);
        allPassed = false;
      }

      if (!hasUIField) {
        console.log(`   ⚠️  Missing UI field in response format`);
        allPassed = false;
      }

    } catch (error) {
      console.log(`❌ ${name.padEnd(15)} - FAILED:`, error instanceof Error ? error.message : 'Unknown error');
      allPassed = false;
    }
  }

  console.log('\n' + '='.repeat(50));

  closeDb();

  if (allPassed) {
    console.log('✅ ALL EYES TRANSFORMED SUCCESSFULLY!');
    console.log('\nKey features verified:');
    console.log('  ✓ All 8 Eyes can be imported');
    console.log('  ✓ Two-phase operation (GUIDANCE/VALIDATION)');
    console.log('  ✓ UI field in response format');
    process.exit(0);
  } else {
    console.log('❌ Some Eyes have issues - review above');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Verification script failed:', error);
  closeDb();
  process.exit(1);
});
