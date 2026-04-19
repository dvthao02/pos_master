CREATE SCHEMA IF NOT EXISTS platform;

CREATE TABLE IF NOT EXISTS platform.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_code VARCHAR(100) NOT NULL UNIQUE,
    schema_name VARCHAR(100) NOT NULL UNIQUE,
    legal_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255),
    subscription_plan VARCHAR(100) NOT NULL DEFAULT 'standard',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    timezone_name VARCHAR(100) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    currency_code CHAR(3) NOT NULL DEFAULT 'VND',
    phone VARCHAR(50),
    email VARCHAR(255),
    tax_code VARCHAR(100),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    store_public_code VARCHAR(30) UNIQUE
);

INSERT INTO platform.tenants (tenant_code, schema_name, legal_name, brand_name)
VALUES ('tenant_demo', 'tenant_demo', 'Demo Tenant Co., Ltd.', 'Demo Tenant')
ON CONFLICT (tenant_code) DO NOTHING;
