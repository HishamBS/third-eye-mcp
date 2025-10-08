// Server-only database wrapper
// This module is only used in API routes and server components
import type { Database as BunDatabase } from 'bun:sqlite';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';

// Re-export types only (no runtime imports)
export type { BunDatabase, BunSQLiteDatabase };

// Dynamic import for server-side only
export async function getDb() {
  if (typeof window !== 'undefined') {
    throw new Error('Database can only be accessed server-side');
  }

  // @ts-ignore - dynamic import
  const { getDb: getDbImpl } = await import('@third-eye/db');
  return getDbImpl();
}

// Export schema types
export type * from '@third-eye/db';
