# DB / Backend Review - 2026-04-19

## Current state

- PostgreSQL connection is reachable on `localhost:5432`.
- `platform` schema contains the core master data, auth/session tables, CRM views, and tenant provisioning functions.
- Live database is ahead of repo-defined migrations because Flyway version `1` is a baseline entry, not a full schema build.

## Applied update (2026-04-19)

- Added auto tenant code generation in DB and backend:
  - Migration: `V10__auto_generate_tenant_code.sql`
  - Sequence: `platform.tenant_code_seq`
  - Function: `platform.fn_next_tenant_code()`
  - Trigger: `trg_tenants_assign_codes` on `platform.tenants`
- CRM tenant creation API now allows omitted `tenantCode`/`schemaName`; backend generates code via DB function and enforces schema format `tenant_<tenantCode>`.
- Added staged cleanup migration:
  - Migration: `V11__drop_legacy_crm_role_permissions_table.sql`
  - Drops legacy table `platform.crm_role_permissions` (table is empty and unused by Java backend code).

## Main findings

### 1. Tenant provisioning is split incorrectly

- Database already owns tenant provisioning with:
  - `platform.fn_provision_tenant(...)`
  - `platform.fn_apply_business_logic(...)`
  - `platform.fn_apply_auto_codes(...)`
  - `platform.fn_upgrade_all_tenants()`
- Backend previously created an empty schema directly, which leaves tenant schemas inconsistent.
- Real data already shows drift:
  - `tenant_acafe` has cloned tenant tables
  - `t_53f14f` exists in `platform.tenants` but has no tenant tables

Decision:

- Keep tenant schema provisioning in the database.
- Backend should validate input, call the provisioning function, and map the result to the API response.

### 2. Role-permission storage has two sources of truth

- `platform.role_permissions` is normalized by `role_id` and `permission_id`.
- `platform.crm_role_permissions` stores text keys and is what CRM backend currently reads.
- Current data:
  - `role_permissions`: populated
  - `crm_role_permissions`: empty

Decision:

- Keep one canonical source only.
- Recommended canonical table: `platform.role_permissions`.
- Either:
  - migrate CRM code to read/write `role_permissions`, or
  - expose a compatibility view if the UI still needs key-based reads.

### 3. Analytics placement is mostly correct

- CRM analytics are already implemented as DB views:
  - `v_crm_dashboard_snapshot`
  - `v_crm_alert_items`
  - `v_crm_recent_activities`
  - `v_crm_audit_events`
  - `v_crm_suspicious_sessions`
  - `v_crm_monthly_tenant_growth`
  - `v_crm_hourly_login_usage`

Decision:

- Keep aggregate reporting and dashboard snapshots in DB views.
- If volume grows, convert hot views to materialized views with scheduled refresh.

### 4. Auth/session/audit model exists in DB but backend does not use it yet

- Tables exist:
  - `platform.auth_sessions`
  - `platform.audit_events`
  - `platform.device_identities`
  - `platform.account_mfa_methods`
- Current counts are all zero.
- Backend login currently updates only `accounts.last_login_at`.

Decision:

- Keep login orchestration and JWT issuance in backend.
- Persist session and audit records from backend into DB.
- DB should enforce constraints and indexes, not own the HTTP login flow.

### 5. Employee listing has N+1 query risk

- Backend loads accounts, then resolves tenant accesses and roles per account with repeated repository calls.
- This is acceptable at small scale, but will degrade as account count grows.

Decision:

- Move employee summary projection into a dedicated SQL view or a batched query.
- Keep DTO mapping and authorization in backend.

## Recommended ownership boundary

## Best placed in DB

- Tenant schema provisioning and upgrade
- Trigger-based `updated_at`
- Sequence / code generation with concurrency guarantees
- Aggregate analytics, reporting, and monitoring views
- Hard integrity rules: unique constraints, FK, indexes, check constraints

## Best placed in backend

- API validation and request/response contracts
- Authentication flow and JWT issuance
- Authorization checks
- Audit/session recording using request metadata
- Orchestration across multiple DB operations and external services

## Priority refactor list

1. Make backend tenant creation call `platform.fn_provision_tenant(...)`.
2. Remove dual role-permission storage and choose one canonical table.
3. Start writing `auth_sessions` and `audit_events` on login and admin actions.
4. Replace employee N+1 loading with a view or batched query.
5. Rebuild Flyway baseline so new environments can reproduce the live schema safely.
