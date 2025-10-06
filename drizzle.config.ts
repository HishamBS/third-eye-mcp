import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './packages/db/schema.ts',
  out: './packages/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './packages/db/overseer.db',
  },
});
