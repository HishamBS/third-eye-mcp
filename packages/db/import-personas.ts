#!/usr/bin/env bun

/**
 * Persona Importer
 *
 * Rehydrates the personas table from the canonical catalog in
 * packages/db/defaults/personas.ts. This is useful when restoring
 * a database that has stale or missing persona rows without
 * running the broader seedDefaults routine.
 */

import { getDb } from "./index";
import { personas } from "./schema";
import { DEFAULT_PERSONAS } from "./defaults/personas";

function generatePersonaId(eye: string, version: number) {
  return `${eye}_v${version}`;
}

export async function importPersonas() {
  console.log("🔄 Restoring personas from catalog defaults...");

  const { db } = getDb();
  const now = new Date();

  for (const persona of DEFAULT_PERSONAS) {
    const id = generatePersonaId(persona.eye, persona.version);

    await db
      .insert(personas)
      .values({
        id,
        eye: persona.eye,
        name: persona.name,
        version: persona.version,
        content: persona.content,
        active: true,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: personas.id,
        set: {
          name: persona.name,
          content: persona.content,
          version: persona.version,
          active: true,
        },
      })
      .run();

    console.log(`  ✅ ${persona.eye} v${persona.version}`);
  }

  console.log(
    `\n🎉 Persona import complete. ${DEFAULT_PERSONAS.length} entries synchronized.`,
  );
}

if (import.meta.main) {
  importPersonas().catch((error) => {
    console.error("❌ Persona import failed:", error);
    process.exit(1);
  });
}
