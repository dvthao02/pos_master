DO $$
BEGIN
    IF to_regclass('platform.accounts') IS NOT NULL THEN
        DELETE FROM platform.account_role_bindings arb
        USING platform.accounts a
        WHERE arb.account_id = a.id
          AND lower(a.username) IN ('platform_root', 'tenant_owner_acafe');

        DELETE FROM platform.account_tenants at
        USING platform.accounts a
        WHERE at.account_id = a.id
          AND lower(a.username) IN ('platform_root', 'tenant_owner_acafe');

        DELETE FROM platform.accounts
        WHERE lower(username) IN ('platform_root', 'tenant_owner_acafe');
    END IF;

    IF to_regclass('platform.tenants') IS NOT NULL THEN
        DELETE FROM platform.tenants t
        WHERE lower(t.tenant_code) = 'tenant_demo'
          AND NOT EXISTS (
              SELECT 1
              FROM platform.account_tenants at
              WHERE at.tenant_id = t.id
          )
          AND NOT EXISTS (
              SELECT 1
              FROM platform.tenant_branches tb
              WHERE tb.tenant_id = t.id
          );
    END IF;
END $$;

CREATE OR REPLACE VIEW platform.v_crm_dashboard_snapshot AS
WITH tenant_stats AS (
    SELECT
        COUNT(*) FILTER (WHERE lower(status) = 'active')::INTEGER AS active_tenants,
        COUNT(*) FILTER (WHERE lower(status) = 'trial')::INTEGER AS trial_tenants,
        COUNT(*) FILTER (WHERE lower(status) = 'suspended')::INTEGER AS suspended_tenants,
        COUNT(*)::INTEGER AS total_tenants,
        COALESCE(
            SUM(
                CASE lower(subscription_plan)
                    WHEN 'standard' THEN 250000
                    WHEN 'pro' THEN 500000
                    WHEN 'enterprise' THEN 1200000
                    ELSE 0
                END
            ),
            0
        )::BIGINT AS estimated_revenue
    FROM platform.tenants
),
store_stats AS (
    SELECT
        COUNT(*)::INTEGER AS total_stores,
        COUNT(*) FILTER (WHERE is_active)::INTEGER AS active_stores
    FROM platform.tenant_branches
),
account_stats AS (
    SELECT
        COUNT(*)::INTEGER AS total_accounts,
        COUNT(*) FILTER (WHERE lower(status) = 'active')::INTEGER AS active_accounts,
        COUNT(*) FILTER (WHERE is_platform_admin)::INTEGER AS total_platform_admins
    FROM platform.accounts
)
SELECT
    tenant_stats.active_tenants,
    tenant_stats.trial_tenants,
    tenant_stats.suspended_tenants,
    tenant_stats.total_tenants,
    tenant_stats.estimated_revenue,
    store_stats.total_stores,
    store_stats.active_stores,
    account_stats.total_accounts,
    account_stats.active_accounts,
    account_stats.total_platform_admins
FROM tenant_stats
CROSS JOIN store_stats
CROSS JOIN account_stats;

CREATE OR REPLACE VIEW platform.v_crm_alert_items AS
SELECT
    'notification'::VARCHAR(20) AS alert_group,
    'warning'::VARCHAR(20) AS severity,
    'TENANT_TRIAL'::VARCHAR(60) AS alert_code,
    t.tenant_code,
    'Tenant ' || t.tenant_code || ' dang o trang thai trial' AS title,
    'Trial'::VARCHAR(30) AS status_label,
    t.updated_at AS event_time
FROM platform.tenants t
WHERE lower(t.status) = 'trial'

UNION ALL

SELECT
    'notification'::VARCHAR(20) AS alert_group,
    'critical'::VARCHAR(20) AS severity,
    'TENANT_SUSPENDED'::VARCHAR(60) AS alert_code,
    t.tenant_code,
    'Tenant ' || t.tenant_code || ' dang bi tam ngung' AS title,
    'Suspended'::VARCHAR(30) AS status_label,
    t.updated_at AS event_time
FROM platform.tenants t
WHERE lower(t.status) = 'suspended'

UNION ALL

SELECT
    'ticket'::VARCHAR(20) AS alert_group,
    CASE WHEN lower(at.status) = 'disabled' THEN 'high' ELSE 'medium' END::VARCHAR(20) AS severity,
    ('ACCOUNT_TENANT_' || upper(at.status))::VARCHAR(60) AS alert_code,
    t.tenant_code,
    'Tai khoan ' || a.username || ' o tenant ' || t.tenant_code || ' co trang thai ' || at.status AS title,
    initcap(at.status)::VARCHAR(30) AS status_label,
    COALESCE(a.last_login_at, t.updated_at) AS event_time
FROM platform.account_tenants at
JOIN platform.tenants t ON t.id = at.tenant_id
JOIN platform.accounts a ON a.id = at.account_id
WHERE lower(at.status) <> 'active';

CREATE OR REPLACE VIEW platform.v_crm_recent_activities AS
SELECT
    'TENANT_UPDATED'::VARCHAR(60) AS activity_type,
    'system'::VARCHAR(120) AS actor,
    t.tenant_code AS object_code,
    'Cap nhat tenant ' || t.tenant_code || ' sang trang thai ' || t.status AS title,
    t.updated_at AS event_time
FROM platform.tenants t

UNION ALL

SELECT
    'ACCOUNT_LOGIN'::VARCHAR(60) AS activity_type,
    a.username::VARCHAR(120) AS actor,
    COALESCE(primary_tenant.tenant_code, 'platform')::VARCHAR(120) AS object_code,
    'Tai khoan ' || a.username || ' dang nhap' AS title,
    a.last_login_at AS event_time
FROM platform.accounts a
LEFT JOIN LATERAL (
    SELECT t.tenant_code
    FROM platform.account_tenants at
    JOIN platform.tenants t ON t.id = at.tenant_id
    WHERE at.account_id = a.id
    ORDER BY CASE WHEN lower(at.status) = 'active' THEN 0 ELSE 1 END, t.tenant_code
    LIMIT 1
) AS primary_tenant ON TRUE
WHERE a.last_login_at IS NOT NULL;

CREATE OR REPLACE VIEW platform.v_crm_audit_events AS
SELECT
    event_time,
    actor AS admin_username,
    activity_type AS action_key,
    object_code,
    NULL::VARCHAR(45) AS ip_address
FROM platform.v_crm_recent_activities;

CREATE OR REPLACE VIEW platform.v_crm_suspicious_sessions AS
SELECT
    a.username,
    lower(a.status) AS status_code,
    CASE
        WHEN lower(a.status) = 'locked' THEN 'Tai khoan bi khoa'
        WHEN lower(a.status) = 'disabled' THEN 'Tai khoan da bi vo hieu'
        WHEN a.last_login_at IS NULL THEN 'Chua co lich su dang nhap'
        ELSE 'Can kiem tra them'
    END AS note,
    NULL::VARCHAR(45) AS ip_address,
    a.last_login_at AS event_time
FROM platform.accounts a
WHERE lower(a.status) IN ('locked', 'disabled')
   OR a.last_login_at IS NULL;

CREATE OR REPLACE VIEW platform.v_crm_monthly_tenant_growth AS
WITH months AS (
    SELECT generate_series(
        date_trunc('month', now()) - INTERVAL '5 months',
        date_trunc('month', now()),
        INTERVAL '1 month'
    ) AS month_start
)
SELECT
    to_char(m.month_start, 'MM/YYYY') AS label,
    COUNT(t.id)::INTEGER AS value,
    m.month_start
FROM months m
LEFT JOIN platform.tenants t
    ON t.created_at >= m.month_start
   AND t.created_at < m.month_start + INTERVAL '1 month'
GROUP BY m.month_start
ORDER BY m.month_start;

CREATE OR REPLACE VIEW platform.v_crm_hourly_login_usage AS
WITH slots AS (
    SELECT generate_series(8, 20, 2) AS hour_bucket
)
SELECT
    lpad(s.hour_bucket::TEXT, 2, '0') || 'h' AS label,
    COUNT(a.id)::INTEGER AS value,
    s.hour_bucket
FROM slots s
LEFT JOIN platform.accounts a
    ON a.last_login_at IS NOT NULL
   AND (a.last_login_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE = (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE
   AND ((extract(hour FROM a.last_login_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::INTEGER / 2) * 2) = s.hour_bucket
GROUP BY s.hour_bucket
ORDER BY s.hour_bucket;
