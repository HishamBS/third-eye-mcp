// Server-only database wrapper
// This module is only used in API routes and server components
import type { Database as BunDatabase } from "bun:sqlite";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

// Re-export types only (no runtime imports)
export type { BunDatabase, BunSQLiteDatabase };

// Dynamic import for server-side only
export async function getDb() {
  if (typeof window !== "undefined") {
    throw new Error("Database can only be accessed server-side");
  }

  // Dynamic import with proper typing
  const dbModule = (await import("@third-eye/db")) as {
    getDb: () => ReturnType<typeof import("@third-eye/db").getDb>;
  };
  return dbModule.getDb();
}

// Export schema types
export type * from "@third-eye/db";
