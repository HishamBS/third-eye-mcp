import { Hono } from "hono";
import { unlink } from "fs/promises";
import { getDbPath, getDb, seedDefaults } from "@third-eye/db";

const app = new Hono();

/**
 * Factory Reset - Delete database and re-seed all defaults
 * Treats all eyes, personas, and pipelines uniformly (no distinction)
 */
app.post("/factory-reset", async (c) => {
  try {
    const dbPath = getDbPath();

    // Delete the database file
    await unlink(dbPath);
    console.log("[Factory Reset] Database deleted:", dbPath);

    // Re-initialize database and seed defaults
    const { db, sqlite } = getDb();
    await seedDefaults({
      force: true,
      log: (msg) => console.log("[Factory Reset]", msg),
    });

    return c.json({
      message: "Factory reset complete. All defaults restored.",
      dbPath,
      seeded: true,
    });
  } catch (error) {
    console.error("Factory reset error:", error);
    return c.json(
      {
        error:
          "Failed to reset: " +
          (error instanceof Error ? error.message : "Unknown error"),
      },
      500,
    );
  }
});

export default app;
