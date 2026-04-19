DO $$
DECLARE
    next_start BIGINT;
BEGIN
    SELECT COALESCE(MAX((regexp_match(tenant_code, '^t_([0-9]+)$'))[1]::BIGINT), 0) + 1
      INTO next_start
    FROM platform.tenants;

    IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'platform'
          AND c.relkind = 'S'
          AND c.relname = 'tenant_code_seq'
    ) THEN
        EXECUTE format('ALTER SEQUENCE platform.tenant_code_seq RESTART WITH %s', next_start);
    ELSE
        EXECUTE format('CREATE SEQUENCE platform.tenant_code_seq START WITH %s INCREMENT BY 1 MINVALUE 1', next_start);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION platform.fn_next_tenant_code()
RETURNS VARCHAR(100)
LANGUAGE plpgsql
AS $$
DECLARE
    candidate_code VARCHAR(100);
BEGIN
    LOOP
        candidate_code := 't_' || lpad(nextval('platform.tenant_code_seq')::TEXT, 6, '0');
        EXIT WHEN NOT EXISTS (
            SELECT 1
            FROM platform.tenants t
            WHERE t.tenant_code = candidate_code
        );
    END LOOP;
    RETURN candidate_code;
END;
$$;

CREATE OR REPLACE FUNCTION platform.fn_assign_tenant_code_and_schema_name()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.tenant_code IS NULL OR btrim(NEW.tenant_code) = '' THEN
        NEW.tenant_code := platform.fn_next_tenant_code();
    ELSE
        NEW.tenant_code := lower(btrim(NEW.tenant_code));
    END IF;

    IF NEW.schema_name IS NULL OR btrim(NEW.schema_name) = '' THEN
        NEW.schema_name := 'tenant_' || NEW.tenant_code;
    ELSE
        NEW.schema_name := lower(btrim(NEW.schema_name));
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tenants_assign_codes ON platform.tenants;

CREATE TRIGGER trg_tenants_assign_codes
BEFORE INSERT ON platform.tenants
FOR EACH ROW
EXECUTE FUNCTION platform.fn_assign_tenant_code_and_schema_name();
