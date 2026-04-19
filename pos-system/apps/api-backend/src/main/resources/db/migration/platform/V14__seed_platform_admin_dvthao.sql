DO $$
DECLARE
    v_account_id UUID;
    v_role_id UUID;
BEGIN
    INSERT INTO platform.accounts (id, username, password, full_name, email, status, is_platform_admin)
    VALUES (
        gen_random_uuid(),
        'dvthao',
        '$2a$06$7q6sVMiEMzFPLRgqCY/QNOihmIHR8kRhRB9igyC1KxzkGKbRqtwEq',
        'DV Thao',
        'dvthao@iorder.local',
        'active',
        TRUE
    )
    ON CONFLICT (username) DO UPDATE
    SET
        full_name = EXCLUDED.full_name,
        email = COALESCE(platform.accounts.email, EXCLUDED.email),
        status = 'active',
        is_platform_admin = TRUE
    RETURNING id INTO v_account_id;

    SELECT id INTO v_role_id
    FROM platform.roles
    WHERE role_key = 'SUPER_ADMIN'
    LIMIT 1;

    IF v_role_id IS NULL THEN
        SELECT id INTO v_role_id
        FROM platform.roles
        WHERE role_key = 'PLATFORM_ADMIN'
        LIMIT 1;
    END IF;

    IF v_role_id IS NOT NULL AND v_account_id IS NOT NULL THEN
        INSERT INTO platform.account_role_bindings (id, account_id, role_id, scope_type, scope_id)
        SELECT gen_random_uuid(), v_account_id, v_role_id, 'platform', NULL
        WHERE NOT EXISTS (
            SELECT 1
            FROM platform.account_role_bindings arb
            WHERE arb.account_id = v_account_id
              AND arb.role_id = v_role_id
              AND arb.scope_type = 'platform'
              AND arb.scope_id IS NULL
        );
    END IF;
END $$;
