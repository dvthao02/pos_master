# web-admin

React + TypeScript frontend for split login zones:

- CRM Admin page (platform zone)
- Store dashboard + store sales page (tenant zone)

## Run

```powershell
npm install
npm run dev
```

Default dev URL: `http://localhost:5173`

Vite proxy forwards `/api/*` to `http://localhost:8080`.

Login routes:

- Store/tenant login: `http://localhost:5173/login`
- CRM admin login: `http://localhost:5173/admin.login`

Platform CRM role behavior:

- `PLATFORM_ADMIN`: full CRM (employee + schema + store CRUD)
- `PLATFORM_SUPPORT`: read-only CRM
- `PLATFORM_STORE_CREATOR`: only create store

## Login test

Platform zone:

- username: `platform_root`
- password: `123456`

Tenant zone:

- username: `tenant_owner_acafe`
- password: `123456`
- tenantCode: `acafe`
