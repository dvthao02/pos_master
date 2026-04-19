-- Part 1: Platform CRM RBAC
-- Refresh platform-scope roles and platform CRM permission catalog.

-- 1) Refresh platform role assignments and role catalog
DELETE FROM platform.account_role_bindings arb
USING platform.roles r
WHERE arb.role_id = r.id
  AND lower(r.role_scope) = 'platform';

DELETE FROM platform.role_permissions rp
USING platform.roles r
WHERE rp.role_id = r.id
  AND lower(r.role_scope) = 'platform';

DELETE FROM platform.roles
WHERE lower(role_scope) = 'platform';

INSERT INTO platform.roles (
    id,
    role_key,
    role_name,
    description,
    role_scope,
    is_system,
    sort_order,
    created_at,
    updated_at
)
VALUES
    (gen_random_uuid(), 'SUPER_ADMIN',        'Sieu quan tri',        'Toan quyen tuyet doi, khong gioi han scope',                 'platform', true,  1, now(), now()),
    (gen_random_uuid(), 'PLATFORM_ADMIN',     'Quan tri platform',    'Toan quyen tren admin: tenant, account, cai dat',            'platform', true, 10, now(), now()),
    (gen_random_uuid(), 'PLATFORM_BILLING',   'Quan ly thanh toan',   'Gia han, doi goi, xuat hoa don SaaS',                        'platform', true, 20, now(), now()),
    (gen_random_uuid(), 'PLATFORM_SALES',     'Kinh doanh',           'Tao tenant, onboard, theo doi hop dong',                     'platform', true, 30, now(), now()),
    (gen_random_uuid(), 'PLATFORM_SUPPORT',   'Ho tro ky thuat',      'Xem du lieu tenant de ho tro, khong sua',                    'platform', true, 40, now(), now()),
    (gen_random_uuid(), 'PLATFORM_MARKETING', 'Marketing',            'Soan va gui thong bao, campaign den tenant',                 'platform', true, 50, now(), now()),
    (gen_random_uuid(), 'PLATFORM_ANALYST',   'Phan tich du lieu',    'Xem toan bo bao cao, thong ke, xuat data',                   'platform', true, 60, now(), now()),
    (gen_random_uuid(), 'PLATFORM_SECURITY',  'Bao mat',              'Audit log, sessions, xu ly bat thuong',                      'platform', true, 70, now(), now()),
    (gen_random_uuid(), 'PLATFORM_READONLY',  'Chi xem',              'Xem moi thu tren admin, khong thao tac',                     'platform', true, 80, now(), now());

-- 2) Refresh platform CRM permission catalog
DELETE FROM platform.role_permissions rp
USING platform.permissions p
WHERE rp.permission_id = p.id
  AND p.module_key IN (
      'tenant',
      'branch',
      'subscription',
      'account',
      'report',
      'notification',
      'support',
      'audit',
      'system',
      'onboarding'
  );

DELETE FROM platform.permissions p
WHERE p.module_key IN (
    'tenant',
    'branch',
    'subscription',
    'account',
    'report',
    'notification',
    'support',
    'audit',
    'system',
    'onboarding'
);

INSERT INTO platform.permissions (
    id,
    permission_key,
    permission_name,
    module_key,
    created_at,
    updated_at
)
VALUES
    -- tenant
    (gen_random_uuid(), 'tenant.view',              'Xem tenant',                  'tenant',       now(), now()),
    (gen_random_uuid(), 'tenant.create',            'Tao tenant',                  'tenant',       now(), now()),
    (gen_random_uuid(), 'tenant.edit',              'Sua tenant',                  'tenant',       now(), now()),
    (gen_random_uuid(), 'tenant.suspend',           'Tam ngung tenant',            'tenant',       now(), now()),
    (gen_random_uuid(), 'tenant.reactivate',        'Kich hoat lai tenant',        'tenant',       now(), now()),
    (gen_random_uuid(), 'tenant.close',             'Dong tenant',                 'tenant',       now(), now()),
    (gen_random_uuid(), 'tenant.impersonate',       'Dang nhap thay tenant',       'tenant',       now(), now()),

    -- branch
    (gen_random_uuid(), 'branch.view',              'Xem chi nhanh',               'branch',       now(), now()),
    (gen_random_uuid(), 'branch.create',            'Tao chi nhanh',               'branch',       now(), now()),
    (gen_random_uuid(), 'branch.edit',              'Sua chi nhanh',               'branch',       now(), now()),
    (gen_random_uuid(), 'branch.suspend',           'Tam ngung chi nhanh',         'branch',       now(), now()),
    (gen_random_uuid(), 'branch.reactivate',        'Kich hoat lai chi nhanh',     'branch',       now(), now()),
    (gen_random_uuid(), 'branch.renew',             'Gia han chi nhanh',           'branch',       now(), now()),
    (gen_random_uuid(), 'branch.close',             'Dong chi nhanh',              'branch',       now(), now()),

    -- subscription
    (gen_random_uuid(), 'subscription.view',        'Xem goi dich vu',             'subscription', now(), now()),
    (gen_random_uuid(), 'subscription.renew',       'Gia han goi',                 'subscription', now(), now()),
    (gen_random_uuid(), 'subscription.upgrade',     'Nang cap goi',                'subscription', now(), now()),
    (gen_random_uuid(), 'subscription.downgrade',   'Ha cap goi',                  'subscription', now(), now()),
    (gen_random_uuid(), 'subscription.free_trial',  'Cap dung thu',                'subscription', now(), now()),
    (gen_random_uuid(), 'subscription.invoice',     'Xuat hoa don SaaS',           'subscription', now(), now()),
    (gen_random_uuid(), 'subscription.pricing',     'Sua bang gia goi',            'subscription', now(), now()),

    -- account
    (gen_random_uuid(), 'account.view',             'Xem tai khoan',               'account',      now(), now()),
    (gen_random_uuid(), 'account.create',           'Tao tai khoan',               'account',      now(), now()),
    (gen_random_uuid(), 'account.edit',             'Sua tai khoan',               'account',      now(), now()),
    (gen_random_uuid(), 'account.lock',             'Khoa tai khoan',              'account',      now(), now()),
    (gen_random_uuid(), 'account.delete',           'Xoa tai khoan',               'account',      now(), now()),
    (gen_random_uuid(), 'account.reset_password',   'Reset mat khau',              'account',      now(), now()),
    (gen_random_uuid(), 'account.assign_role',      'Phan quyen',                  'account',      now(), now()),
    (gen_random_uuid(), 'account.view_sessions',    'Xem sessions',                'account',      now(), now()),
    (gen_random_uuid(), 'account.force_logout',     'Force logout',                'account',      now(), now()),

    -- report
    (gen_random_uuid(), 'report.dashboard',         'Xem dashboard',               'report',       now(), now()),
    (gen_random_uuid(), 'report.revenue',           'Bao cao doanh thu',           'report',       now(), now()),
    (gen_random_uuid(), 'report.tenant_growth',     'Tang truong tenant',          'report',       now(), now()),
    (gen_random_uuid(), 'report.churn',             'Churn rate',                  'report',       now(), now()),
    (gen_random_uuid(), 'report.mrr_arr',           'MRR ARR',                     'report',       now(), now()),
    (gen_random_uuid(), 'report.usage',             'Thong ke su dung',            'report',       now(), now()),
    (gen_random_uuid(), 'report.export',            'Xuat bao cao',                'report',       now(), now()),
    (gen_random_uuid(), 'report.schedule',          'Len lich bao cao tu dong',    'report',       now(), now()),

    -- notification
    (gen_random_uuid(), 'notification.view',        'Xem thong bao',               'notification', now(), now()),
    (gen_random_uuid(), 'notification.create',      'Soan thong bao',              'notification', now(), now()),
    (gen_random_uuid(), 'notification.send',        'Gui thong bao',               'notification', now(), now()),
    (gen_random_uuid(), 'notification.broadcast',   'Gui hang loat',               'notification', now(), now()),
    (gen_random_uuid(), 'notification.delete',      'Xoa thong bao',               'notification', now(), now()),
    (gen_random_uuid(), 'notification.template',    'Quan ly mau thong bao',       'notification', now(), now()),

    -- support
    (gen_random_uuid(), 'support.view_tickets',     'Xem ticket ho tro',           'support',      now(), now()),
    (gen_random_uuid(), 'support.reply',            'Phan hoi ticket',             'support',      now(), now()),
    (gen_random_uuid(), 'support.close_ticket',     'Dong ticket',                 'support',      now(), now()),
    (gen_random_uuid(), 'support.view_tenant_data', 'Xem data tenant de ho tro',  'support',      now(), now()),
    (gen_random_uuid(), 'support.remote_access',    'Truy cap tu xa tenant',       'support',      now(), now()),

    -- audit
    (gen_random_uuid(), 'audit.view_logs',          'Xem audit log',               'audit',        now(), now()),
    (gen_random_uuid(), 'audit.export_logs',        'Xuat audit log',              'audit',        now(), now()),
    (gen_random_uuid(), 'audit.view_sessions',      'Xem sessions toan he thong',  'audit',        now(), now()),
    (gen_random_uuid(), 'audit.force_logout_all',   'Force logout toan he thong',  'audit',        now(), now()),
    (gen_random_uuid(), 'audit.security_alert',     'Nhan canh bao bao mat',       'audit',        now(), now()),

    -- system
    (gen_random_uuid(), 'system.view_config',       'Xem cau hinh',                'system',       now(), now()),
    (gen_random_uuid(), 'system.edit_config',       'Sua cau hinh',                'system',       now(), now()),
    (gen_random_uuid(), 'system.smtp',              'Cau hinh SMTP',               'system',       now(), now()),
    (gen_random_uuid(), 'system.integration',       'Quan ly tich hop',            'system',       now(), now()),
    (gen_random_uuid(), 'system.api_keys',          'Quan ly API keys',            'system',       now(), now()),
    (gen_random_uuid(), 'system.webhook',           'Quan ly webhook',             'system',       now(), now()),
    (gen_random_uuid(), 'system.maintenance',       'Che do bao tri',              'system',       now(), now()),
    (gen_random_uuid(), 'system.backup',            'Backup Restore',              'system',       now(), now()),

    -- onboarding
    (gen_random_uuid(), 'onboarding.view',          'Xem onboarding',              'onboarding',   now(), now()),
    (gen_random_uuid(), 'onboarding.manage',        'Quan ly onboarding',          'onboarding',   now(), now());

-- 3) Role-permission mapping
-- SUPER_ADMIN + PLATFORM_ADMIN -> full
INSERT INTO platform.role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM platform.roles r
CROSS JOIN platform.permissions p
WHERE r.role_key IN ('SUPER_ADMIN', 'PLATFORM_ADMIN')
  AND p.module_key IN ('tenant','branch','subscription','account','report','notification','support','audit','system','onboarding')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- PLATFORM_BILLING
INSERT INTO platform.role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM platform.roles r
CROSS JOIN platform.permissions p
WHERE r.role_key = 'PLATFORM_BILLING'
  AND p.permission_key IN (
      'tenant.view',
      'branch.view','branch.renew',
      'subscription.view','subscription.renew','subscription.upgrade',
      'subscription.downgrade','subscription.free_trial',
      'subscription.invoice','subscription.pricing',
      'report.dashboard','report.revenue','report.mrr_arr','report.export'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- PLATFORM_SALES
INSERT INTO platform.role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM platform.roles r
CROSS JOIN platform.permissions p
WHERE r.role_key = 'PLATFORM_SALES'
  AND p.permission_key IN (
      'tenant.view','tenant.create','tenant.edit',
      'branch.view','branch.create',
      'subscription.view','subscription.free_trial',
      'onboarding.view','onboarding.manage',
      'report.dashboard','report.tenant_growth'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- PLATFORM_SUPPORT
INSERT INTO platform.role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM platform.roles r
CROSS JOIN platform.permissions p
WHERE r.role_key = 'PLATFORM_SUPPORT'
  AND p.permission_key IN (
      'tenant.view','branch.view',
      'account.view','account.view_sessions',
      'support.view_tickets','support.reply','support.close_ticket',
      'support.view_tenant_data','support.remote_access',
      'report.dashboard',
      'audit.view_logs','audit.view_sessions'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- PLATFORM_MARKETING
INSERT INTO platform.role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM platform.roles r
CROSS JOIN platform.permissions p
WHERE r.role_key = 'PLATFORM_MARKETING'
  AND p.permission_key IN (
      'tenant.view',
      'notification.view','notification.create','notification.send',
      'notification.broadcast','notification.delete','notification.template',
      'report.dashboard','report.tenant_growth','report.churn'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- PLATFORM_ANALYST
INSERT INTO platform.role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM platform.roles r
CROSS JOIN platform.permissions p
WHERE r.role_key = 'PLATFORM_ANALYST'
  AND p.permission_key LIKE 'report.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- PLATFORM_SECURITY
INSERT INTO platform.role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM platform.roles r
CROSS JOIN platform.permissions p
WHERE r.role_key = 'PLATFORM_SECURITY'
  AND p.permission_key IN (
      'audit.view_logs','audit.export_logs','audit.view_sessions',
      'audit.force_logout_all','audit.security_alert',
      'account.view_sessions','account.force_logout','account.lock'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- PLATFORM_READONLY -> all *.view*
INSERT INTO platform.role_permissions (role_id, permission_id, created_at)
SELECT r.id, p.id, now()
FROM platform.roles r
CROSS JOIN platform.permissions p
WHERE r.role_key = 'PLATFORM_READONLY'
  AND p.permission_key LIKE '%.view%'
ON CONFLICT (role_id, permission_id) DO NOTHING;
