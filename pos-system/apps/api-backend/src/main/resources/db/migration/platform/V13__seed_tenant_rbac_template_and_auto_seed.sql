-- Part 2: Tenant RBAC seed template and auto-seed for new tenants.

CREATE OR REPLACE FUNCTION platform.fn_seed_tenant_rbac(p_schema character varying)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_schema text := trim(p_schema);
BEGIN
    IF v_schema IS NULL OR v_schema = '' THEN
        RAISE EXCEPTION 'Schema name is required';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.schemata s
        WHERE s.schema_name = v_schema
    ) THEN
        RAISE EXCEPTION 'Schema % does not exist', v_schema;
    END IF;

    EXECUTE format($f$
        CREATE TABLE IF NOT EXISTS %I.roles (
            id uuid DEFAULT gen_random_uuid() NOT NULL,
            role_key character varying(100) NOT NULL,
            role_name character varying(150) NOT NULL,
            description text,
            is_system boolean DEFAULT false NOT NULL,
            created_at timestamptz DEFAULT now() NOT NULL,
            updated_at timestamptz DEFAULT now() NOT NULL,
            CONSTRAINT %I_roles_pkey PRIMARY KEY (id),
            CONSTRAINT %I_roles_role_key_key UNIQUE (role_key)
        )
    $f$, v_schema, v_schema, v_schema);

    EXECUTE format($f$
        CREATE TABLE IF NOT EXISTS %I.permissions (
            id uuid DEFAULT gen_random_uuid() NOT NULL,
            permission_key character varying(150) NOT NULL,
            permission_name character varying(150) NOT NULL,
            module_key character varying(80) NOT NULL,
            created_at timestamptz DEFAULT now() NOT NULL,
            updated_at timestamptz DEFAULT now() NOT NULL,
            CONSTRAINT %I_permissions_pkey PRIMARY KEY (id),
            CONSTRAINT %I_permissions_permission_key_key UNIQUE (permission_key)
        )
    $f$, v_schema, v_schema, v_schema);

    EXECUTE format($f$
        CREATE TABLE IF NOT EXISTS %I.role_permissions (
            id uuid DEFAULT gen_random_uuid() NOT NULL,
            role_id uuid NOT NULL,
            permission_id uuid NOT NULL,
            created_at timestamptz DEFAULT now() NOT NULL,
            CONSTRAINT %I_role_permissions_pkey PRIMARY KEY (id),
            CONSTRAINT %I_role_permissions_role_permission_key UNIQUE (role_id, permission_id),
            CONSTRAINT %I_role_permissions_role_fk
                FOREIGN KEY (role_id) REFERENCES %I.roles(id) ON DELETE CASCADE,
            CONSTRAINT %I_role_permissions_permission_fk
                FOREIGN KEY (permission_id) REFERENCES %I.permissions(id) ON DELETE CASCADE
        )
    $f$, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema, v_schema);

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.role_permissions(role_id)',
        v_schema || '_role_permissions_role_id_idx', v_schema);

    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.role_permissions(permission_id)',
        v_schema || '_role_permissions_permission_id_idx', v_schema);

    EXECUTE format('DELETE FROM %I.role_permissions', v_schema);
    EXECUTE format('DELETE FROM %I.roles', v_schema);
    EXECUTE format('DELETE FROM %I.permissions', v_schema);

    EXECUTE format($f$
        INSERT INTO %I.roles (id, role_key, role_name, description, is_system, created_at, updated_at)
        VALUES
            (gen_random_uuid(), 'TENANT_OWNER',      'Chu doanh nghiep',     'Toan quyen trong tenant: cau hinh, nhan vien, bao cao chuoi', true, now(), now()),
            (gen_random_uuid(), 'TENANT_ADMIN',      'Quan tri chuoi',       'Quan ly chi nhanh, nhan vien, san pham - duoi TENANT_OWNER',   true, now(), now()),
            (gen_random_uuid(), 'TENANT_ACCOUNTANT', 'Ke toan noi bo',       'Xem bao cao tai chinh toan chuoi, xuat so sach',               true, now(), now()),
            (gen_random_uuid(), 'AUDITOR',           'Kiem toan',            'Chi xem bao cao, so sach, audit log',                          true, now(), now()),
            (gen_random_uuid(), 'STORE_ADMIN',       'Quan ly cua hang',     'Toan quyen 1 chi nhanh: nhan vien, don, kho, bao cao',         true, now(), now()),
            (gen_random_uuid(), 'STORE_MANAGER',     'Truong ca Giam sat',   'Quan ly ca, duyet dieu chinh, xem bao cao chi nhanh',          true, now(), now()),
            (gen_random_uuid(), 'CASHIER',           'Thu ngan',             'Tao don, nhan thanh toan, hoan tra',                           true, now(), now()),
            (gen_random_uuid(), 'INVENTORY',         'Thu kho',              'Nhap xuat kho, kiem ke',                                       true, now(), now()),
            (gen_random_uuid(), 'STORE_STAFF',       'Nhan vien phuc vu',    'Ghi order tai ban, khong thao tac thanh toan',                 true, now(), now()),
            (gen_random_uuid(), 'KITCHEN_STAFF',     'Nhan vien bep',        'Xem va cap nhat trang thai mon tren man hinh bep',             true, now(), now()),
            (gen_random_uuid(), 'DELIVERY_STAFF',    'Giao hang',            'Nhan va cap nhat trang thai don giao di',                      true, now(), now())
    $f$, v_schema);

    EXECUTE format($f$
        INSERT INTO %I.permissions (id, permission_key, permission_name, module_key, created_at, updated_at)
        VALUES
            -- order
            (gen_random_uuid(), 'order.view',           'Xem don hang',             'order',         now(), now()),
            (gen_random_uuid(), 'order.create',         'Tao don',                  'order',         now(), now()),
            (gen_random_uuid(), 'order.edit',           'Sua don',                  'order',         now(), now()),
            (gen_random_uuid(), 'order.cancel',         'Huy don',                  'order',         now(), now()),
            (gen_random_uuid(), 'order.refund',         'Hoan tra',                 'order',         now(), now()),
            (gen_random_uuid(), 'order.discount',       'Ap dung giam gia',         'order',         now(), now()),
            (gen_random_uuid(), 'order.split',          'Tach gop don',             'order',         now(), now()),

            -- payment
            (gen_random_uuid(), 'payment.receive',      'Nhan thanh toan',          'payment',       now(), now()),
            (gen_random_uuid(), 'payment.view',         'Xem lich su thanh toan',   'payment',       now(), now()),
            (gen_random_uuid(), 'payment.void',         'Huy giao dich',            'payment',       now(), now()),
            (gen_random_uuid(), 'payment.method',       'Quan ly PTTT',             'payment',       now(), now()),

            -- product
            (gen_random_uuid(), 'product.view',         'Xem san pham',             'product',       now(), now()),
            (gen_random_uuid(), 'product.create',       'Them san pham',            'product',       now(), now()),
            (gen_random_uuid(), 'product.edit',         'Sua san pham',             'product',       now(), now()),
            (gen_random_uuid(), 'product.delete',       'Xoa san pham',             'product',       now(), now()),
            (gen_random_uuid(), 'product.pricing',      'Sua gia ban',              'product',       now(), now()),
            (gen_random_uuid(), 'product.category',     'Quan ly danh muc',         'product',       now(), now()),

            -- inventory
            (gen_random_uuid(), 'inventory.view',       'Xem ton kho',              'inventory',     now(), now()),
            (gen_random_uuid(), 'inventory.import',     'Nhap kho',                 'inventory',     now(), now()),
            (gen_random_uuid(), 'inventory.export',     'Xuat kho',                 'inventory',     now(), now()),
            (gen_random_uuid(), 'inventory.adjust',     'Dieu chinh ton kho',       'inventory',     now(), now()),
            (gen_random_uuid(), 'inventory.audit',      'Kiem ke',                  'inventory',     now(), now()),
            (gen_random_uuid(), 'inventory.supplier',   'Quan ly nha cung cap',     'inventory',     now(), now()),

            -- staff
            (gen_random_uuid(), 'staff.view',           'Xem nhan vien',            'staff',         now(), now()),
            (gen_random_uuid(), 'staff.create',         'Them nhan vien',           'staff',         now(), now()),
            (gen_random_uuid(), 'staff.edit',           'Sua nhan vien',            'staff',         now(), now()),
            (gen_random_uuid(), 'staff.delete',         'Xoa nhan vien',            'staff',         now(), now()),
            (gen_random_uuid(), 'staff.assign_role',    'Phan quyen nhan vien',     'staff',         now(), now()),
            (gen_random_uuid(), 'staff.timekeeping',    'Quan ly cham cong',        'staff',         now(), now()),

            -- shift
            (gen_random_uuid(), 'shift.view',           'Xem ca lam viec',          'shift',         now(), now()),
            (gen_random_uuid(), 'shift.create',         'Tao ca',                   'shift',         now(), now()),
            (gen_random_uuid(), 'shift.close',          'Dong ca',                  'shift',         now(), now()),
            (gen_random_uuid(), 'shift.report',         'Bao cao ca',               'shift',         now(), now()),

            -- customer
            (gen_random_uuid(), 'customer.view',        'Xem khach hang',           'customer',      now(), now()),
            (gen_random_uuid(), 'customer.create',      'Them khach hang',          'customer',      now(), now()),
            (gen_random_uuid(), 'customer.edit',        'Sua khach hang',           'customer',      now(), now()),
            (gen_random_uuid(), 'customer.delete',      'Xoa khach hang',           'customer',      now(), now()),
            (gen_random_uuid(), 'customer.loyalty',     'Quan ly diem tich luy',    'customer',      now(), now()),

            -- table
            (gen_random_uuid(), 'table.view',           'Xem so do ban',            'table',         now(), now()),
            (gen_random_uuid(), 'table.manage',         'Quan ly ban khu vuc',      'table',         now(), now()),
            (gen_random_uuid(), 'table.transfer',       'Chuyen ban',               'table',         now(), now()),

            -- store report
            (gen_random_uuid(), 'store_report.view',    'Xem bao cao cua hang',     'store_report',  now(), now()),
            (gen_random_uuid(), 'store_report.export',  'Xuat bao cao',             'store_report',  now(), now()),
            (gen_random_uuid(), 'store_report.finance', 'Bao cao tai chinh',        'store_report',  now(), now()),
            (gen_random_uuid(), 'store_report.staff',   'Bao cao nhan vien',        'store_report',  now(), now()),

            -- setting
            (gen_random_uuid(), 'setting.view',         'Xem cai dat',              'setting',       now(), now()),
            (gen_random_uuid(), 'setting.edit',         'Sua cai dat cua hang',     'setting',       now(), now()),
            (gen_random_uuid(), 'setting.printer',      'Cau hinh may in',          'setting',       now(), now()),
            (gen_random_uuid(), 'setting.tax',          'Cau hinh thue',            'setting',       now(), now()),
            (gen_random_uuid(), 'setting.branch',       'Quan ly chi nhanh',        'setting',       now(), now())
    $f$, v_schema);

    -- TENANT_OWNER + TENANT_ADMIN -> full
    EXECUTE format($f$
        INSERT INTO %I.role_permissions (role_id, permission_id, created_at)
        SELECT r.id, p.id, now()
        FROM %I.roles r
        CROSS JOIN %I.permissions p
        WHERE r.role_key IN ('TENANT_OWNER', 'TENANT_ADMIN')
    $f$, v_schema, v_schema, v_schema);

    -- TENANT_ACCOUNTANT + AUDITOR
    EXECUTE format($f$
        INSERT INTO %I.role_permissions (role_id, permission_id, created_at)
        SELECT r.id, p.id, now()
        FROM %I.roles r
        CROSS JOIN %I.permissions p
        WHERE r.role_key IN ('TENANT_ACCOUNTANT', 'AUDITOR')
          AND p.permission_key IN (
              'store_report.view','store_report.export',
              'store_report.finance','store_report.staff',
              'inventory.view','shift.view','shift.report'
          )
    $f$, v_schema, v_schema, v_schema);

    -- STORE_ADMIN -> full
    EXECUTE format($f$
        INSERT INTO %I.role_permissions (role_id, permission_id, created_at)
        SELECT r.id, p.id, now()
        FROM %I.roles r
        CROSS JOIN %I.permissions p
        WHERE r.role_key = 'STORE_ADMIN'
    $f$, v_schema, v_schema, v_schema);

    -- STORE_MANAGER
    EXECUTE format($f$
        INSERT INTO %I.role_permissions (role_id, permission_id, created_at)
        SELECT r.id, p.id, now()
        FROM %I.roles r
        CROSS JOIN %I.permissions p
        WHERE r.role_key = 'STORE_MANAGER'
          AND p.permission_key IN (
              'order.view','order.cancel','order.discount',
              'payment.view','payment.void',
              'shift.view','shift.create','shift.close','shift.report',
              'staff.view','staff.timekeeping',
              'table.view','table.manage','table.transfer',
              'store_report.view','store_report.export',
              'inventory.view','customer.view'
          )
    $f$, v_schema, v_schema, v_schema);

    -- CASHIER
    EXECUTE format($f$
        INSERT INTO %I.role_permissions (role_id, permission_id, created_at)
        SELECT r.id, p.id, now()
        FROM %I.roles r
        CROSS JOIN %I.permissions p
        WHERE r.role_key = 'CASHIER'
          AND p.permission_key IN (
              'order.view','order.create','order.edit','order.cancel','order.refund','order.discount',
              'payment.receive','payment.view',
              'customer.view','customer.create',
              'table.view','table.transfer',
              'product.view'
          )
    $f$, v_schema, v_schema, v_schema);

    -- INVENTORY
    EXECUTE format($f$
        INSERT INTO %I.role_permissions (role_id, permission_id, created_at)
        SELECT r.id, p.id, now()
        FROM %I.roles r
        CROSS JOIN %I.permissions p
        WHERE r.role_key = 'INVENTORY'
          AND p.permission_key LIKE 'inventory.%%'
    $f$, v_schema, v_schema, v_schema);

    -- STORE_STAFF
    EXECUTE format($f$
        INSERT INTO %I.role_permissions (role_id, permission_id, created_at)
        SELECT r.id, p.id, now()
        FROM %I.roles r
        CROSS JOIN %I.permissions p
        WHERE r.role_key = 'STORE_STAFF'
          AND p.permission_key IN (
              'order.view','order.create','order.edit',
              'table.view','table.transfer',
              'product.view','customer.view'
          )
    $f$, v_schema, v_schema, v_schema);

    -- KITCHEN_STAFF
    EXECUTE format($f$
        INSERT INTO %I.role_permissions (role_id, permission_id, created_at)
        SELECT r.id, p.id, now()
        FROM %I.roles r
        CROSS JOIN %I.permissions p
        WHERE r.role_key = 'KITCHEN_STAFF'
          AND p.permission_key IN ('order.view','product.view')
    $f$, v_schema, v_schema, v_schema);

    -- DELIVERY_STAFF
    EXECUTE format($f$
        INSERT INTO %I.role_permissions (role_id, permission_id, created_at)
        SELECT r.id, p.id, now()
        FROM %I.roles r
        CROSS JOIN %I.permissions p
        WHERE r.role_key = 'DELIVERY_STAFF'
          AND p.permission_key IN ('order.view','order.edit','customer.view')
    $f$, v_schema, v_schema, v_schema);
END;
$$;

CREATE OR REPLACE FUNCTION platform.fn_seed_tenant_rbac_after_tenant_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM platform.fn_seed_tenant_rbac(NEW.schema_name);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenants_seed_tenant_rbac ON platform.tenants;

CREATE TRIGGER trg_tenants_seed_tenant_rbac
AFTER INSERT ON platform.tenants
FOR EACH ROW
EXECUTE FUNCTION platform.fn_seed_tenant_rbac_after_tenant_insert();

DO $$
DECLARE
    r record;
BEGIN
    PERFORM platform.fn_seed_tenant_rbac('tenant_template');

    FOR r IN
        SELECT t.schema_name
        FROM platform.tenants t
        WHERE t.schema_name IS NOT NULL
    LOOP
        PERFORM platform.fn_seed_tenant_rbac(r.schema_name);
    END LOOP;
END;
$$;
