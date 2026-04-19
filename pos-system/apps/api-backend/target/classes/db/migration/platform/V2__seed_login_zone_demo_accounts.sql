DO $$
DECLARE
    v_platform_admin_account_id UUID := '11111111-1111-1111-1111-111111111111';
    v_tenant_admin_account_id   UUID := '22222222-2222-2222-2222-222222222222';
    v_platform_role_id          UUID;
    v_tenant_owner_role_id      UUID;
    v_tenant_id                 UUID;
BEGIN
    INSERT INTO platform.accounts (id, username, password, full_name, status, is_platform_admin)
    VALUES (
        v_platform_admin_account_id,
        'platform_root',
        '$2a$06$7q6sVMiEMzFPLRgqCY/QNOihmIHR8kRhRB9igyC1KxzkGKbRqtwEq',
        'Platform Root',
        'active',
        TRUE
    )
    ON CONFLICT (username) DO NOTHING;

    INSERT INTO platform.accounts (id, username, password, full_name, status, is_platform_admin)
    VALUES (
        v_tenant_admin_account_id,
        'tenant_owner_acafe',
        '$2a$06$TEH1vw1i1yFu/fl5xBPqG.eJzlWrcYwyfKDBrKn8e1CcwG1eV9NWq',
        'Tenant Owner ACAFE',
        'active',
        FALSE
    )
    ON CONFLICT (username) DO NOTHING;

    SELECT id INTO v_platform_role_id
    FROM platform.roles
    WHERE role_key = 'PLATFORM_ADMIN'
    LIMIT 1;

    IF v_platform_role_id IS NOT NULL THEN
        INSERT INTO platform.account_role_bindings (id, account_id, role_id, scope_type, scope_id)
        SELECT gen_random_uuid(), v_platform_admin_account_id, v_platform_role_id, 'platform', NULL
        WHERE NOT EXISTS (
            SELECT 1
            FROM platform.account_role_bindings arb
            WHERE arb.account_id = v_platform_admin_account_id
              AND arb.role_id = v_platform_role_id
              AND arb.scope_type = 'platform'
              AND arb.scope_id IS NULL
        );
    END IF;

    SELECT id INTO v_tenant_id
    FROM platform.tenants
    WHERE tenant_code = 'acafe'
    LIMIT 1;

    IF v_tenant_id IS NOT NULL THEN
        INSERT INTO platform.account_tenants (id, account_id, tenant_id, access_level, status)
        SELECT gen_random_uuid(), v_tenant_admin_account_id, v_tenant_id, 'owner', 'active'
        WHERE NOT EXISTS (
            SELECT 1
            FROM platform.account_tenants at
            WHERE at.account_id = v_tenant_admin_account_id
              AND at.tenant_id = v_tenant_id
        );

        SELECT id INTO v_tenant_owner_role_id
        FROM platform.roles
        WHERE role_key = 'TENANT_OWNER'
        LIMIT 1;

        IF v_tenant_owner_role_id IS NOT NULL THEN
            INSERT INTO platform.account_role_bindings (id, account_id, role_id, scope_type, scope_id)
            SELECT gen_random_uuid(), v_tenant_admin_account_id, v_tenant_owner_role_id, 'tenant', v_tenant_id
            WHERE NOT EXISTS (
                SELECT 1
                FROM platform.account_role_bindings arb
                WHERE arb.account_id = v_tenant_admin_account_id
                  AND arb.role_id = v_tenant_owner_role_id
                  AND arb.scope_type = 'tenant'
                  AND arb.scope_id = v_tenant_id
            );
        END IF;
    END IF;
END $$;
