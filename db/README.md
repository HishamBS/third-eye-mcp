# Database Migration Plan

- Migration framework: Alembic
- Target: ApsaraDB for PostgreSQL (multi-AZ, PITR)
- Steps:
  1. Generate baseline revision from current SQLite schema.
  2. Add tables for runs, vectors, claims, api_keys, docs, rate_counters, config_versions, audit.
  3. Implement downgrade paths where possible; document irreversible migrations.
4. Test migrations locally via `alembic upgrade head` and on a pre-production namespace or temporary test stack before production cutover.
