# Platform DB Inventory (2026-04-19)

## Snapshot files

- [docs/db-dumps/platform_schema_2026-04-19.sql](docs/db-dumps/platform_schema_2026-04-19.sql)
- [docs/db-dumps/platform_flyway_history_2026-04-19.sql](docs/db-dumps/platform_flyway_history_2026-04-19.sql)
- [docs/db-dumps/platform_schema_2026-04-19_after_v11.sql](docs/db-dumps/platform_schema_2026-04-19_after_v11.sql)
- [docs/db-dumps/platform_flyway_history_2026-04-19_after_v11.sql](docs/db-dumps/platform_flyway_history_2026-04-19_after_v11.sql)

## Flyway state in DB

Applied versions in `platform.flyway_schema_history`:

1. Baseline v1
2. V2 seed login zone demo accounts
3. V3 seed platform store creator role
4. V4 seed platform super admin dvthao
5. V5 cleanup test data and create crm views
6. V6 add role permissions table
7. V7 add crm role permissions table
8. V8 standardize role scope and defaults
9. V9 backfill role permissions from crm table
10. V10 auto generate tenant code

## Current DB objects (platform schema)

- Tables + views: 26 objects
- Functions: 7 routines
- Triggers: 13 (including `trg_tenants_assign_codes`)

Key checks:

- `platform.fn_next_tenant_code`: present
- `platform.fn_assign_tenant_code_and_schema_name`: present
- `platform.tenant_code_seq`: present
- `platform.trg_tenants_assign_codes` on `platform.tenants`: present

## Data status of role-permission tables

- `platform.role_permissions`: 180 rows
- `platform.crm_role_permissions`: dropped in V11

`platform.crm_role_permissions` was legacy and no longer referenced by backend Java code.

## Ordered cleanup plan

1. Keep all historical Flyway files V1..V10 in repository. Do not delete applied migration files.
2. Use V11 to drop legacy table `platform.crm_role_permissions`. (Done on local DB)
3. Run Flyway migrate on each environment. (Pending for other environments)
4. Re-dump schema after V11 for audit trail. (Done)

## Why old SQL should not be deleted directly

Deleting old versioned Flyway SQL files causes migration validation drift and makes state reconciliation harder. Versioned files must remain immutable once applied.

## Notes

- SQL files under `apps/api-backend/target/classes/db/migration/platform` are generated build outputs, not source migrations.
- Canonical migration sources are only under `apps/api-backend/src/main/resources/db/migration/platform`.
