# Alembic Migrations

Create new migrations with:

```bash
alembic revision -m "add_runs_table"
```

Apply migrations:

```bash
alembic upgrade head
```

Ensure migrations are idempotent and reversible where possible.
