#!/usr/bin/env bun
/**
 * Phase 12 - Persona Migration Script
 *
 * Transforms TEXT blob personas to structured schema (R10 compliant)
 *
 * WARNING: This is a destructive one-way migration.
 * - Reads all personas with `content` TEXT blob
 * - Parses as PersonaBlueprint
 * - Transforms to structured columns
 * - Drops `content` column after migration
 * - Per R10: NO backward compatibility
 *
 * Run once on startup, marks as complete in app_settings.
 */

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";
import path from "path";
import { homedir } from "os";

const MIGRATION_KEY = "migration_phase12_personas_completed";
const DB_PATH = path.join(homedir(), ".third-eye-mcp", "data.db");

interface OldPersonaRow {
  id: string;
  eye: string;
  name: string;
  version: number;
  content: string; // TEXT blob
  active: number;
  createdAt: number;
}

interface PersonaBlueprint {
  metadata: {
    eyeId: string;
    name: string;
    description: string;
    version: string | number;
    capabilities: string[];
  };
  mission: string;
  phases: {
    guidance?: {
      mission: string;
      check: string;
      reminders: string[];
      example: string;
    };
    validation?: {
      mission: string;
      check: string;
      reminders: string[];
      example: string;
    };
  };
  envelopeContract: {
    requiredKeys: string[];
    requiredDataKeys: string[];
    requiredUiKeys: string[];
  };
  reminders: string[];
  notes?: string;
  llmConfig?: {
    temperature?: number;
    top_p?: number;
    response_format?: string;
    max_tokens?: number;
  };
}

interface NewPersonaRow {
  id: string;
  eye: string;
  name: string;
  version: number;
  metadata_json: string;
  mission: string;
  guidance_json: string | null;
  validation_json: string | null;
  envelope_json: string;
  reminders_json: string;
  notes: string | null;
  llm_config_json: string;
  active: number;
  createdAt: number;
}

async function main() {
  console.log("[Migrate Phase 12] Starting persona migration...");

  const sqlite = new Database(DB_PATH);
  const db = drizzle(sqlite);

  // Check if migration already completed
  const migrationCheck = sqlite
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(MIGRATION_KEY) as { value: string } | undefined;

  if (migrationCheck?.value === "true") {
    console.log("[Migrate Phase 12] Migration already completed. Skipping.");
    sqlite.close();
    return;
  }

  // Check if content column exists (if not, migration already happened)
  const tableInfo = sqlite
    .prepare(`PRAGMA table_info(personas)`)
    .all() as Array<{
    name: string;
  }>;
  const hasContentColumn = tableInfo.some((col) => col.name === "content");

  if (!hasContentColumn) {
    console.log(
      "[Migrate Phase 12] Schema already migrated (no content column). Marking as complete.",
    );
    sqlite
      .prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`)
      .run(MIGRATION_KEY, "true");
    sqlite.close();
    return;
  }

  console.log(
    "[Migrate Phase 12] Found content column. Starting transformation...",
  );

  // Read all old personas
  const oldPersonas = sqlite
    .prepare(`SELECT * FROM personas`)
    .all() as OldPersonaRow[];

  console.log(
    `[Migrate Phase 12] Found ${oldPersonas.length} personas to migrate`,
  );

  let successCount = 0;
  let errorCount = 0;

  // Transform each persona
  for (const old of oldPersonas) {
    try {
      console.log(
        `[Migrate Phase 12] Transforming ${old.eye} v${old.version}...`,
      );

      // Parse TEXT blob as PersonaBlueprint
      const blueprint: PersonaBlueprint = JSON.parse(old.content);

      // Default LLM config if not present
      const llmConfig = blueprint.llmConfig || {
        temperature: 0,
        top_p: 1,
        response_format: "json_object",
        max_tokens: 2000,
      };

      // Transform to new structure
      const newRow: NewPersonaRow = {
        id: old.id,
        eye: old.eye,
        name: old.name,
        version: old.version,
        metadata_json: JSON.stringify(blueprint.metadata),
        mission: blueprint.mission,
        guidance_json: blueprint.phases.guidance
          ? JSON.stringify(blueprint.phases.guidance)
          : null,
        validation_json: blueprint.phases.validation
          ? JSON.stringify(blueprint.phases.validation)
          : null,
        envelope_json: JSON.stringify(blueprint.envelopeContract),
        reminders_json: JSON.stringify(blueprint.reminders),
        notes: blueprint.notes || null,
        llm_config_json: JSON.stringify(llmConfig),
        active: old.active,
        createdAt: old.createdAt,
      };

      // Check if new columns exist
      const newColumnsExist = tableInfo.some(
        (col) => col.name === "metadata_json",
      );

      if (!newColumnsExist) {
        console.error(
          "[Migrate Phase 12] ERROR: New columns do not exist yet. Run Drizzle migration first.",
        );
        process.exit(1);
      }

      // Update row with new structured data
      sqlite
        .prepare(
          `
        UPDATE personas
        SET
          metadata_json = ?,
          mission = ?,
          guidance_json = ?,
          validation_json = ?,
          envelope_json = ?,
          reminders_json = ?,
          notes = ?,
          llm_config_json = ?
        WHERE id = ?
      `,
        )
        .run(
          newRow.metadata_json,
          newRow.mission,
          newRow.guidance_json,
          newRow.validation_json,
          newRow.envelope_json,
          newRow.reminders_json,
          newRow.notes,
          newRow.llm_config_json,
          newRow.id,
        );

      console.log(
        `[Migrate Phase 12] ✓ Transformed ${old.eye} v${old.version}`,
      );
      successCount++;
    } catch (error) {
      console.error(
        `[Migrate Phase 12] ✗ Failed to transform ${old.eye} v${old.version}:`,
        error,
      );
      errorCount++;
    }
  }

  console.log(
    `[Migrate Phase 12] Transformation complete: ${successCount} success, ${errorCount} errors`,
  );

  if (errorCount > 0) {
    console.error(
      "[Migrate Phase 12] Migration had errors. NOT dropping content column.",
    );
    sqlite.close();
    process.exit(1);
  }

  // Drop content column (R10: no backward compatibility)
  console.log("[Migrate Phase 12] Dropping content column per R10...");
  try {
    // SQLite doesn't support DROP COLUMN directly, need to recreate table
    sqlite.exec(`
      -- Backup personas table
      CREATE TABLE personas_backup AS SELECT * FROM personas;

      -- Drop old table
      DROP TABLE personas;

      -- Recreate without content column
      CREATE TABLE personas (
        id TEXT PRIMARY KEY,
        eye TEXT NOT NULL,
        name TEXT NOT NULL,
        version INTEGER NOT NULL,
        metadata_json TEXT NOT NULL,
        mission TEXT NOT NULL,
        guidance_json TEXT,
        validation_json TEXT,
        envelope_json TEXT NOT NULL,
        reminders_json TEXT NOT NULL,
        notes TEXT,
        llm_config_json TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        UNIQUE(eye, version)
      );

      -- Copy transformed data
      INSERT INTO personas SELECT
        id, eye, name, version,
        metadata_json, mission, guidance_json, validation_json,
        envelope_json, reminders_json, notes, llm_config_json,
        active, created_at
      FROM personas_backup;

      -- Drop backup
      DROP TABLE personas_backup;
    `);

    console.log("[Migrate Phase 12] ✓ Content column dropped successfully");
  } catch (error) {
    console.error("[Migrate Phase 12] ✗ Failed to drop content column:", error);
    sqlite.close();
    process.exit(1);
  }

  // Mark migration as complete
  sqlite
    .prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`)
    .run(MIGRATION_KEY, "true");

  console.log("[Migrate Phase 12] ✓ Migration complete and marked as done");
  sqlite.close();
}

main().catch((err) => {
  console.error("[Migrate Phase 12] Fatal error:", err);
  process.exit(1);
});
