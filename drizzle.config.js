import { defineConfig } from "drizzle-kit";
export default defineConfig({
    schema: "./packages/db/schema.ts",
    out: "./packages/db/migrations",
    dialect: "sqlite",
    dbCredentials: {
        url: "./packages/db/overseer.db",
    },
    casing: "snake_case", // Map camelCase schema fields to snake_case database columns
});
//# sourceMappingURL=drizzle.config.js.map