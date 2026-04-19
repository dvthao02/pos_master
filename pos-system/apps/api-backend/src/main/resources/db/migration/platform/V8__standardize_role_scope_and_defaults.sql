ALTER TABLE platform.roles
    ADD COLUMN IF NOT EXISTS role_scope VARCHAR(20);

ALTER TABLE platform.roles
    ADD COLUMN IF NOT EXISTS sort_order INTEGER;

ALTER TABLE platform.roles
    ALTER COLUMN is_system SET DEFAULT false;

UPDATE platform.roles
SET role_scope = CASE
    WHEN UPPER(role_key) LIKE 'PLATFORM\_%' ESCAPE '\' THEN 'platform'
    ELSE 'tenant'
END
WHERE role_scope IS NULL
   OR TRIM(role_scope) = '';

UPDATE platform.roles
SET sort_order = CASE role_key
    WHEN 'PLATFORM_ADMIN' THEN 10
    WHEN 'PLATFORM_SUPPORT' THEN 20
    WHEN 'PLATFORM_STORE_CREATOR' THEN 30
    WHEN 'TENANT_OWNER' THEN 110
    WHEN 'STORE_ADMIN' THEN 120
    WHEN 'STORE_MANAGER' THEN 130
    WHEN 'CASHIER' THEN 140
    WHEN 'INVENTORY' THEN 150
    WHEN 'AUDITOR' THEN 160
    ELSE 900
END
WHERE sort_order IS NULL;

ALTER TABLE platform.roles
    ALTER COLUMN role_scope SET NOT NULL;

ALTER TABLE platform.roles
    ALTER COLUMN sort_order SET NOT NULL;

ALTER TABLE platform.roles
    ALTER COLUMN sort_order SET DEFAULT 900;

CREATE INDEX IF NOT EXISTS idx_platform_roles_scope_sort
    ON platform.roles(role_scope, sort_order, role_key);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_platform_roles_scope'
    ) THEN
        ALTER TABLE platform.roles
            ADD CONSTRAINT chk_platform_roles_scope
            CHECK (LOWER(role_scope) IN ('platform', 'tenant'));
    END IF;
END $$;
