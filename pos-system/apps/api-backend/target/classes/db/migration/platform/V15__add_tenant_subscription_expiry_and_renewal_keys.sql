ALTER TABLE platform.tenants
    ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

UPDATE platform.tenants
SET subscription_expires_at = CASE
    WHEN lower(status) = 'trial' THEN created_at + interval '30 days'
    ELSE created_at + interval '12 months'
END
WHERE subscription_expires_at IS NULL;

CREATE TABLE IF NOT EXISTS platform.renewal_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_code TEXT UNIQUE NOT NULL,
    tenant_id UUID REFERENCES platform.tenants(id) ON DELETE CASCADE,
    extend_months INT NOT NULL,
    created_by UUID REFERENCES platform.accounts(id),
    used_by UUID REFERENCES platform.accounts(id),
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'used', 'expired')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_renewal_keys_tenant_status
    ON platform.renewal_keys (tenant_id, status);

CREATE INDEX IF NOT EXISTS ix_renewal_keys_expires_at
    ON platform.renewal_keys (expires_at);
