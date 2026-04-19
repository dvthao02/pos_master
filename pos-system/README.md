# POS System Workspace

## Folder naming convention

- `apps/*`: executable applications
- `web-*`: React web applications
- `mobile-*`: React Native applications
- `api-*`: backend services
- `packages/*`: shared libraries used by multiple apps
- `infra/*`: deployment and runtime infrastructure

## Structure

```text
pos-system/
|-- apps/
|   |-- api-backend
|   |-- web-pos
|   |-- web-admin
|   |-- web-tenant
|   |-- web-storefront
|   `-- mobile-owner
|-- packages/
|   |-- shared-ui
|   |-- shared-types
|   `-- shared-utils
|-- infra/
|   |-- docker
|   |-- nginx
|   `-- cicd
`-- docs/
```
