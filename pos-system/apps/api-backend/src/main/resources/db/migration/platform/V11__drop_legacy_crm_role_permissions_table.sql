-- Cleanup legacy table that is no longer used by backend code.
-- Canonical source is platform.role_permissions.
DROP TABLE IF EXISTS platform.crm_role_permissions;
