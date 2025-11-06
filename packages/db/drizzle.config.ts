import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:///tmp/dummy.db', // Not used for generate command
  },
  casing: 'snake_case', // Map camelCase schema fields to snake_case database columns
});
