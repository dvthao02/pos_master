# API Backend

Spring Boot 3 backend with PostgreSQL connection, schema-based multi-tenant foundation, and JWT login-zone split.

## Current setup

- Datasource:
- `jdbc:postgresql://localhost:5432/iOrderMaster?currentSchema=platform`
- username: `vanthao`
- password: `123`
- Default schema: `platform`
- Tenant context is read from JWT claim `tenantCode`

## Login zones

- `POST /api/auth/platform/login`
- `POST /api/auth/tenant/login`

JWT claims include:

- `tenantCode`
- `loginZone` (`platform` or `tenant`)
- `roles`

## Dev seed accounts

- Platform zone:
- username: `dvthao`
- password: `123456`

Test seeds `platform_root`, `tenant_owner_acafe`, and `tenant_demo` are cleaned by migration `V5`.

## API quick test

```powershell
cd D:\iOrder-Thao\project_iOrder\pos-system\apps\api-backend
.\mvnw.cmd spring-boot:run
```

If startup fails with Flyway checksum mismatch (common when using restored backup DB), run:

```powershell
.\mvnw.cmd --% -q -Dflyway.url=jdbc:postgresql://localhost:5432/iOrderMaster -Dflyway.user=vanthao -Dflyway.password=123 -Dflyway.defaultSchema=platform -Dflyway.schemas=platform -Dflyway.locations=filesystem:src/main/resources/db/migration/platform org.flywaydb:flyway-maven-plugin:10.10.0:repair
```

```powershell
# platform login
$platform = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/auth/platform/login' `
  -ContentType 'application/json' `
  -Body (@{ username='dvthao'; password='123456' } | ConvertTo-Json)

# create platform admin account (DB persisted)
Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/crm/employees' `
  -ContentType 'application/json' `
  -Headers @{ Authorization = "Bearer $($platform.accessToken)" } `
  -Body (@{
      username='new_platform_admin'
      password='Temp@1234'
      fullName='New Platform Admin'
      status='active'
      platformAdmin=$true
      platformRoleKeys=@('PLATFORM_ADMIN')
    } | ConvertTo-Json)

# whoami (read token claims)
Invoke-RestMethod -Method Get -Uri 'http://localhost:8080/api/auth/me' `
  -Headers @{ Authorization = "Bearer $($platform.accessToken)" }

# crm analytics (real data from postgres views)
Invoke-RestMethod -Method Get -Uri 'http://localhost:8080/api/crm/analytics' `
  -Headers @{ Authorization = "Bearer $($platform.accessToken)" }
```

## Notes

- `/api/crm/**` accepts platform roles (`PLATFORM_ADMIN`, `PLATFORM_SUPPORT`, `PLATFORM_STORE_CREATOR`).
- Tenant token calling `/api/crm/**` is rejected with `403`.
- Platform role `PLATFORM_STORE_CREATOR` is allowed to call CRM but can only create store (`POST /api/crm/stores`).
- CRM analytics endpoint: `GET /api/crm/analytics`.
- PostgreSQL views created by `V5`:
  - `platform.v_crm_dashboard_snapshot`
  - `platform.v_crm_alert_items`
  - `platform.v_crm_recent_activities`
  - `platform.v_crm_audit_events`
  - `platform.v_crm_suspicious_sessions`
  - `platform.v_crm_monthly_tenant_growth`
  - `platform.v_crm_hourly_login_usage`
- Tenant schema management endpoints:
  - `GET /api/crm/tenant-schemas` (admin/support)
  - `POST /api/crm/tenant-schemas` (admin)
  - `PUT /api/crm/tenant-schemas/{tenantCode}` (admin)

### Tenant code auto-generate (new)

- Flyway migration `V10__auto_generate_tenant_code.sql` adds:
  - `platform.tenant_code_seq`
  - `platform.fn_next_tenant_code()`
  - trigger `trg_tenants_assign_codes` on `platform.tenants`
- `POST /api/crm/tenant-schemas` now accepts missing `tenantCode` and `schemaName`.
  - Backend will request next code from DB (`platform.fn_next_tenant_code()`).
  - Effective schema name is always normalized to `tenant_<tenantCode>`.
  - If caller sends `schemaName`, it must match the computed value.
