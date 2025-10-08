# Database Schema & Migrations

Third Eye MCP uses **SQLite** with **Drizzle ORM** for data persistence. All data is stored locally in `~/.third-eye-mcp/mcp.db` by default.

---

## Schema Overview

### 13 Core Tables

1. **sessions** - User sessions
2. **runs** - Individual Eye execution runs
3. **pipeline_runs** - Multi-Eye pipeline executions
4. **pipeline_events** - Real-time pipeline events
5. **personas** - Persona versions for each Eye
6. **eyes_routing** - Eye-to-model routing configurations
7. **eyes_custom** - User-defined custom Eyes
8. **prompts** - Saved prompt templates
9. **strictness_profiles** - Validation strictness levels
10. **pipelines** - Pre-configured multi-Eye workflows
11. **provider_keys** - Encrypted API keys for providers
12. **models_cache** - Cached model metadata
13. **app_settings** - Global application settings

---

## Entity Relationships

```
sessions (1:N) runs
sessions (1:N) pipeline_runs

pipeline_runs (1:N) pipeline_events

personas (N:1) eye (via eye field)
eyes_routing (1:1) eye
prompts (N:1) eye
strictness_profiles (1:1) eye
```

---

## Key Tables

### sessions

```typescript
{
  id: string;           // Unique session ID
  userId: string | null; // Optional user identifier
  createdAt: Date;
  metadata: object;      // JSON metadata
}
```

### personas

```typescript
{
  eye: string;          // Eye name (sharingan, rinnegan, etc.)
  version: number;      // Persona version number
  content: string;      // Persona prompt template
  active: boolean;      // Is this the active version?
  createdAt: Date;
}
```

**Versioning**: Each Eye can have multiple persona versions. Only one version can be `active: true` at a time.

### eyes_routing

```typescript
{
  eye: string;               // Eye name
  primaryProvider: string;   // groq | openrouter | ollama | lmstudio
  primaryModel: string;      // Model ID
  fallbackProvider: string | null;
  fallbackModel: string | null;
}
```

**Fallback Logic**: If primary model fails, automatically retry with fallback.

### provider_keys

```typescript
{
  provider: string;     // groq | openrouter | ollama | lmstudio
  apiKey: string;       // AES-256-GCM encrypted key
  encrypted: boolean;   // Always true in production
  createdAt: Date;
  lastUsed: Date | null;
  metadata: object;
}
```

**Security**: API keys are encrypted using `THIRD_EYE_SECURITY_ENCRYPTION_KEY` environment variable.

---

## Migrations

### Generate Migrations

After modifying `packages/db/schema.ts`:

```bash
bun run db:generate
```

This creates a new migration file in `packages/db/migrations/`.

### Apply Migrations

```bash
bun run db:migrate
```

Applies all pending migrations to the database.

### Push Schema Directly (Dev Only)

```bash
bun run db:push
```

Syncs schema directly to database without creating migration files. **Do not use in production.**

### View Database

```bash
bun run db:studio
```

Opens **Drizzle Studio** in browser for visual schema exploration and data browsing.

---

## Database Location

Default location: `~/.third-eye-mcp/mcp.db`

Override with environment variable:

```bash
MCP_DB=/custom/path/mcp.db
```

---

## Backup & Restore

### Manual Backup

```bash
cp ~/.third-eye-mcp/mcp.db ~/.third-eye-mcp/backup-$(date +%Y%m%d).db
```

### Automated Backups

Set up a cron job:

```bash
# Daily backup at 3 AM
0 3 * * * cp ~/.third-eye-mcp/mcp.db ~/.third-eye-mcp/backup-$(date +\%Y\%m\%d).db
```

### Restore from Backup

```bash
cp ~/.third-eye-mcp/backup-20250105.db ~/.third-eye-mcp/mcp.db
```

---

## Performance Tuning

SQLite is optimized for read-heavy workloads. For high-traffic scenarios:

1. **Enable WAL mode** (Write-Ahead Logging):
   ```sql
   PRAGMA journal_mode=WAL;
   ```

2. **Increase cache size**:
   ```sql
   PRAGMA cache_size=10000;
   ```

3. **Add indexes** on frequently queried columns (already configured in schema).

---

## Schema Evolution

To add a new table:

1. Define schema in `packages/db/schema.ts`
2. Export from `packages/db/index.ts`
3. Generate migration: `bun run db:generate`
4. Apply migration: `bun run db:migrate`
5. Update TypeScript types automatically (via Drizzle inference)

---

## Troubleshooting

### Migration Conflicts

If you encounter migration conflicts:

```bash
# Reset to clean state (⚠️ DELETES ALL DATA)
rm -rf ~/.third-eye-mcp/mcp.db
bun run setup
```

### Locked Database

If you see `database is locked` errors:

1. Close all connections (stop server)
2. Delete `.db-wal` and `.db-shm` files
3. Restart server

### Corrupted Database

```bash
sqlite3 ~/.third-eye-mcp/mcp.db
> PRAGMA integrity_check;
```

If corrupted, restore from backup.

---

## Development Workflow

```bash
# 1. Make schema changes
vim packages/db/schema.ts

# 2. Generate migration
bun run db:generate

# 3. Apply migration
bun run db:migrate

# 4. Seed default data
bun run seed

# 5. Verify with Drizzle Studio
bun run db:studio
```

---

## Production Checklist

- [ ] All migrations applied
- [ ] Backups configured
- [ ] WAL mode enabled
- [ ] Encryption key set (`THIRD_EYE_SECURITY_ENCRYPTION_KEY`)
- [ ] Database file permissions: `600` (read/write owner only)

---

For more details, see:
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
