CREATE TABLE IF NOT EXISTS platform.crm_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_key VARCHAR(100) NOT NULL,
    permission_key VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_platform_crm_role_permissions UNIQUE (role_key, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_platform_crm_role_permissions_role_key
    ON platform.crm_role_permissions(role_key);

CREATE INDEX IF NOT EXISTS idx_platform_crm_role_permissions_permission_key
    ON platform.crm_role_permissions(permission_key);
