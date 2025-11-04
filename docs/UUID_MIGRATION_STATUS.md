# UUID Standardization Migration V1 - Status Report

## Date: 2025-01-04
## Status: IN PROGRESS (Phase 1 Complete - Database & Seeding)

## Overview
Comprehensive migration from string-based identifiers (eye names) to professional UUID architecture across the ENTIRE application.

## Completed ✅

### 1. Core Infrastructure
- ✅ **UUID Utility** (`packages/db/utils/uuid.ts`) - SSOT for ID generation using nanoid
- ✅ **Lookup Utilities** (`packages/db/utils/lookups.ts`) - Name ↔ UUID conversion with caching
  - `getEyeIdByName()`, `getEyeByName()`, `getEyeById()`
  - `getEyeNameById()`, `getAllActiveEyes()`
  - `getPersonaIdByName()`, `getPipelineIdByName()`
  - 60-second TTL cache for performance

### 2. Database Schema (`packages/db/schema.ts`)
All entities now have proper UUID primary keys and foreign key constraints:

**Migrated Entities:**
- `eyes` - UUID id, name as display field
- `eyesRouting` - UUID id + eyeId FK
- `personas` - UUID id + eyeId FK
- `personaBlueprints` - UUID id + eyeId FK
- `eyeLeaderboard` - UUID id + eyeId FK
- `runs` - eyeId FK to eyes
- `pipelineEvents` - eyeId FK to eyes (nullable)
- `providerFailovers` - eyeId FK to eyes
- `rateLimitTracking` - eyeId FK to eyes (nullable)
- `duels` - eyeId FK to eyes
- `nodeConfigs` - eyeId FK to eyes (nullable)
- `appSettings` - UUID id + unique key
- `providerKeys` - UUID id (was auto-increment integer)
- `modelsCache` - UUID id + unique (provider, model)
- `strictnessProfiles` - UUID id
- All other entities already used UUIDs

### 3. Migration SQL (`packages/db/migrations/0001_uuid_standardization_v1.sql`)
Comprehensive 400-line migration script that:
- Generates UUIDs for all entities
- Maps eye names to UUIDs
- Recreates tables with proper PKs/FKs
- Preserves ALL existing data
- Adds unique indexes on name fields
- Drops old tables after migration

### 4. Seeding Logic (`packages/db/defaults/index.ts`)
**Completely rewritten** to use UUIDs:
- `seedEyes()` - Generates UUIDs, populates EYE_NAME_TO_UUID_MAP
- `seedBlueprints()` - Uses eye UUID lookups
- `seedPersonas()` - Uses eye UUID lookups
- `seedRouting()` - Uses eye UUID lookups
- `seedAppSettings()` - Generates UUIDs for settings
- `seedPipelines()` - Already used UUIDs
- `seedIntegrations()` - Uses generateId()
- `seedStrictness()` - Generates UUIDs

### 5. Database Queries (`packages/db/queries.ts`)
- ✅ `calculateEyeTrend()` - Uses eyeId with name lookup
- ✅ `updateEyeLeaderboard()` - Uses eyeId for all operations
- ✅ `getEyeLeaderboards()` - Returns names but uses UUIDs internally

### 6. Core Packages (Partial)
- ✅ `model-discovery.ts` - modelsCache now uses UUID ids

## In Progress 🔄

### Core Packages
Fixing build errors in:
- ⏳ `orchestrator.ts` - Replace `eye` with `eyeId` (6 errors)
- ⏳ `pipeline-orchestrator.ts` - Replace `eye` with `eyeId` (1 error)
- ⏳ `rate-limiter.ts` - Replace `eye` with `eyeId` (1 error)
- ⏳ `session-manager.ts` - Replace `run.eye` with `run.eyeId` (2 errors)

## Remaining Work 📋

### Phase 2: Core & API (High Priority)
1. **capability-loader.ts** - Query eyes by eyeId
2. **Validation Middleware** (`apps/server/src/middleware/validation.ts`)
   - Remove `z.enum(EYES)` validation
   - Add name → UUID normalization
3. **ALL API Routes** (Critical - ~10 files):
   - `eyes.ts` - Use UUID params, lookup by name
   - `routing.ts` - Accept name or UUID, normalize
   - `personas.ts` - Use eyeId everywhere
   - `session.ts` - Use eyeId for run queries
   - `database.ts` - Update any eye references
   - `mcp.ts` - Update any eye references
   - `leaderboards.ts` - Already uses getEyeLeaderboards()
   - Plus all others

### Phase 3: Frontend (Massive Scope - 100+ files)
**ALL** frontend needs updating to use UUIDs:
- Pages: `/eyes/*`, `/models/*`, `/personas/*`, `/pipelines/*`, `/monitor/*`
- Components: `EyeIcon`, `EyeRoutingCard`, `SessionSelector`, `EyeCard`, etc.
- Services: All API calls passing eye names
- Types: Update all interfaces to use `eyeId: string` (UUID)

### Phase 4: Testing & Verification
1. Run migration on existing database
2. Verify data integrity
3. Test all API endpoints
4. Test all frontend pages
5. E2E testing with UUIDs
6. Build verification

## Key Decisions & Patterns

### 1. UUID Generation
- **SSOT**: `packages/db/utils/uuid.ts`
- Uses `nanoid()` for compact, URL-safe UUIDs (21 chars)
- All IDs generated at insertion time

### 2. Lookup Pattern
```typescript
// Always lookup UUID before querying
const eyeId = await getEyeIdByName(eyeName);
if (!eyeId) throw new Error(`Eye not found: ${eyeName}`);

// Use UUID for all database operations
const runs = await db.select().from(runs).where(eq(runs.eyeId, eyeId));

// Return names for display
const eyeName = await getEyeNameById(eyeId);
```

### 3. API Compatibility
- **Accept**: Eye name OR UUID
- **Normalize**: Convert name → UUID in middleware
- **Store**: Always use UUID in database
- **Return**: Include both `id` (UUID) and `name` for clients

### 4. Frontend Pattern
- **Store** `eyeId` (UUID) in state/props
- **Display**: Use `eyeName` from API responses
- **Send**: Can send name or UUID (backend normalizes)

## Build Status
**Current Errors**: 11 TypeScript errors in core packages (see "In Progress" above)
**Target**: 0 errors before proceeding to API/frontend

## Migration Risks & Mitigations

### Risk 1: Data Loss
- **Mitigation**: Comprehensive backup before migration
- Migration preserves all data via mapping tables
- Rollback script available (reverse migration)

### Risk 2: Breaking Changes
- **Mitigation**: Dual support for name/UUID in APIs (Phase 2)
- Gradual rollout with feature flags
- Comprehensive E2E tests before deployment

### Risk 3: Performance
- **Mitigation**: Lookup cache with 60s TTL
- Database indexes on both UUIDs and names
- Batch lookups for bulk operations

## Next Steps (Immediate)

1. Fix remaining 11 TypeScript errors in core packages
2. Update validation middleware
3. Update routing.ts and eyes.ts API routes
4. Test basic eye creation/retrieval with UUIDs
5. Continue with remaining API routes

## Acceptance Criteria

- [ ] ALL entities use UUID primary keys
- [ ] ALL foreign keys reference UUIDs with proper constraints
- [ ] Name fields have unique indexes for efficient lookups
- [ ] Single consolidated migration file runs successfully
- [ ] No string-based entity references anywhere in code
- [ ] Lookup helpers work with caching
- [ ] ALL tests pass
- [ ] Build succeeds with 0 errors
- [ ] E2E tests verify UUID functionality

## Notes

- This is a **V1 RELEASE BLOCKER** migration
- Requires **multiple context windows** to complete
- Estimated **500+ files** need updating
- **Database-first approach** - schema/seeding complete before code
- **Professional architecture** - no more case-sensitivity issues, proper referential integrity

## Related Files

- Plan: `protect-git-work-and-clean-branches.plan.md`
- Schema: `packages/db/schema.ts`
- Migration: `packages/db/migrations/0001_uuid_standardization_v1.sql`
- Utilities: `packages/db/utils/{uuid,lookups}.ts`
- Seeding: `packages/db/defaults/index.ts`

---

**Last Updated**: 2025-01-04T23:30:00Z
**Next Review**: After Phase 2 completion (API routes done)

