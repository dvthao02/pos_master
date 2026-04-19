INSERT INTO platform.role_permissions (id, role_id, permission_id, created_at)
SELECT
    gen_random_uuid(),
    r.id,
    p.id,
    NOW()
FROM platform.crm_role_permissions crp
JOIN platform.roles r
    ON UPPER(r.role_key) = UPPER(crp.role_key)
JOIN platform.permissions p
    ON LOWER(p.permission_key) = LOWER(crp.permission_key)
ON CONFLICT (role_id, permission_id) DO NOTHING;
