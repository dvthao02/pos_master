CREATE TABLE IF NOT EXISTS platform.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES platform.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES platform.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_platform_role_permissions UNIQUE (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_role_permissions_role_id
    ON platform.role_permissions(role_id);

CREATE INDEX IF NOT EXISTS idx_platform_role_permissions_permission_id
    ON platform.role_permissions(permission_id);
