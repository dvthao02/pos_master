--
-- PostgreSQL database dump
--

\restrict I1SanTRVh5niPlOdSZosqxIOqbOXjyYHgT5uUdYWALidpCP2ofMwyj0pgELExZV

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: platform; Type: SCHEMA; Schema: -; Owner: vanthao
--

CREATE SCHEMA platform;


ALTER SCHEMA platform OWNER TO vanthao;

--
-- Name: fn_apply_auto_codes(character varying); Type: FUNCTION; Schema: platform; Owner: vanthao
--

CREATE FUNCTION platform.fn_apply_auto_codes(p_schema character varying) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE s varchar := p_schema;
BEGIN
  RAISE NOTICE '🔑 Auto-codes for schema: %', s;

  -- fn_next_code helper
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_next_code(p_type varchar, p_prefix varchar, p_store_id uuid DEFAULT NULL)
    RETURNS varchar LANGUAGE plpgsql AS $body$
    DECLARE v_next bigint;
    BEGIN
      INSERT INTO %I.document_sequences (store_id, doc_type, prefix, pad_length, last_number)
      VALUES (p_store_id, p_type, p_prefix, 6, 0)
      ON CONFLICT (store_id, doc_type) DO NOTHING;
      UPDATE %I.document_sequences
      SET last_number = last_number + 1, updated_at = now()
      WHERE (store_id = p_store_id OR (store_id IS NULL AND p_store_id IS NULL))
        AND doc_type = p_type
      RETURNING last_number INTO v_next;
      RETURN p_prefix || lpad(v_next::text, 6, '0');
    END;$body$
  $f$, s, s, s);

  -- stores
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_store_code()
    RETURNS trigger LANGUAGE plpgsql AS $body$
    DECLARE v_main varchar; v_seq int; v_code varchar; v_tries int := 0;
    BEGIN
      IF NEW.store_code IS NOT NULL AND NEW.store_code <> '' THEN RETURN NEW; END IF;
      SELECT store_code INTO v_main FROM %I.stores WHERE parent_id IS NULL LIMIT 1;
      IF v_main IS NULL THEN
        LOOP
          v_code := 'st' || lpad(floor(random()*900000+100000)::text,6,'0');
          EXIT WHEN NOT EXISTS (SELECT 1 FROM %I.stores WHERE store_code = v_code);
          v_tries := v_tries+1; EXIT WHEN v_tries > 20;
        END LOOP;
        NEW.store_code := v_code;
        UPDATE platform.tenants SET store_public_code = v_code WHERE schema_name = %L;
      ELSE
        SELECT COUNT(*)+1 INTO v_seq FROM %I.stores WHERE parent_id IS NOT NULL;
        NEW.store_code := v_main || '_' || v_seq;
      END IF;
      RETURN NEW;
    END;$body$
  $f$, s, s, s, s, s);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_stores_auto_code ON %I.stores', s);
  EXECUTE format('CREATE TRIGGER trg_stores_auto_code BEFORE INSERT ON %I.stores FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_store_code()', s, s);

  -- product_categories: DM000001
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_category_code()
    RETURNS trigger LANGUAGE plpgsql AS $body$
    BEGIN
      IF NEW.category_code IS NOT NULL AND NEW.category_code <> '' THEN RETURN NEW; END IF;
      NEW.category_code := %I.fn_next_code('category','DM'); RETURN NEW;
    END;$body$
  $f$, s, s);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_categories_auto_code ON %I.product_categories', s);
  EXECUTE format('CREATE TRIGGER trg_categories_auto_code BEFORE INSERT ON %I.product_categories FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_category_code()', s, s);

  -- products: SP000001
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_product_code()
    RETURNS trigger LANGUAGE plpgsql AS $body$
    BEGIN
      IF NEW.product_code IS NOT NULL AND NEW.product_code <> '' THEN RETURN NEW; END IF;
      NEW.product_code := %I.fn_next_code('product','SP'); RETURN NEW;
    END;$body$
  $f$, s, s);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_products_auto_code ON %I.products', s);
  EXECUTE format('CREATE TRIGGER trg_products_auto_code BEFORE INSERT ON %I.products FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_product_code()', s, s);

  -- stock_locations: LO000001
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_location_code()
    RETURNS trigger LANGUAGE plpgsql AS $body$
    BEGIN
      IF NEW.location_code IS NOT NULL AND NEW.location_code <> '' THEN RETURN NEW; END IF;
      NEW.location_code := %I.fn_next_code('location','LO',NEW.store_id); RETURN NEW;
    END;$body$
  $f$, s, s);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_locations_auto_code ON %I.stock_locations', s);
  EXECUTE format('CREATE TRIGGER trg_locations_auto_code BEFORE INSERT ON %I.stock_locations FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_location_code()', s, s);

  -- registers: QU000001
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_register_code()
    RETURNS trigger LANGUAGE plpgsql AS $body$
    BEGIN
      IF NEW.register_code IS NOT NULL AND NEW.register_code <> '' THEN RETURN NEW; END IF;
      NEW.register_code := %I.fn_next_code('register','QU',NEW.store_id); RETURN NEW;
    END;$body$
  $f$, s, s);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_registers_auto_code ON %I.registers', s);
  EXECUTE format('CREATE TRIGGER trg_registers_auto_code BEFORE INSERT ON %I.registers FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_register_code()', s, s);

  -- staff_members: NV000001
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_staff_code()
    RETURNS trigger LANGUAGE plpgsql AS $body$
    BEGIN
      IF NEW.staff_code IS NOT NULL AND NEW.staff_code <> '' THEN RETURN NEW; END IF;
      NEW.staff_code := %I.fn_next_code('staff','NV'); RETURN NEW;
    END;$body$
  $f$, s, s);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_staff_auto_code ON %I.staff_members', s);
  EXECUTE format('CREATE TRIGGER trg_staff_auto_code BEFORE INSERT ON %I.staff_members FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_staff_code()', s, s);

  -- customers: KH000001
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_customer_code()
    RETURNS trigger LANGUAGE plpgsql AS $body$
    BEGIN
      IF NEW.customer_code IS NOT NULL AND NEW.customer_code <> '' THEN RETURN NEW; END IF;
      NEW.customer_code := %I.fn_next_code('customer','KH'); RETURN NEW;
    END;$body$
  $f$, s, s);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_customers_auto_code ON %I.customers', s);
  EXECUTE format('CREATE TRIGGER trg_customers_auto_code BEFORE INSERT ON %I.customers FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_customer_code()', s, s);

  -- suppliers: NC000001
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_supplier_code()
    RETURNS trigger LANGUAGE plpgsql AS $body$
    BEGIN
      IF NEW.supplier_code IS NOT NULL AND NEW.supplier_code <> '' THEN RETURN NEW; END IF;
      NEW.supplier_code := %I.fn_next_code('supplier','NC'); RETURN NEW;
    END;$body$
  $f$, s, s);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_suppliers_auto_code ON %I.suppliers', s);
  EXECUTE format('CREATE TRIGGER trg_suppliers_auto_code BEFORE INSERT ON %I.suppliers FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_supplier_code()', s, s);

  -- purchase_orders: PO000001
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_po_code()
    RETURNS trigger LANGUAGE plpgsql AS $body$
    BEGIN
      IF NEW.po_code IS NOT NULL AND NEW.po_code <> '' THEN RETURN NEW; END IF;
      NEW.po_code := %I.fn_next_code('purchase_order','PO',NEW.store_id); RETURN NEW;
    END;$body$
  $f$, s, s);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_po_auto_code ON %I.purchase_orders', s);
  EXECUTE format('CREATE TRIGGER trg_po_auto_code BEFORE INSERT ON %I.purchase_orders FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_po_code()', s, s);

  -- work_shifts: CA000001
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_shift_code()
    RETURNS trigger LANGUAGE plpgsql AS $body$
    BEGIN
      IF NEW.shift_code IS NOT NULL AND NEW.shift_code <> '' THEN RETURN NEW; END IF;
      NEW.shift_code := %I.fn_next_code('work_shift','CA',NEW.store_id); RETURN NEW;
    END;$body$
  $f$, s, s);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_shifts_auto_code ON %I.work_shifts', s);
  EXECUTE format('CREATE TRIGGER trg_shifts_auto_code BEFORE INSERT ON %I.work_shifts FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_shift_code()', s, s);

  -- sales_orders: SO000001
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_order_code()
    RETURNS trigger LANGUAGE plpgsql AS $body$
    BEGIN
      IF NEW.order_code IS NOT NULL AND NEW.order_code <> '' THEN RETURN NEW; END IF;
      NEW.order_code := %I.fn_next_code('sales_order','SO',NEW.store_id); RETURN NEW;
    END;$body$
  $f$, s, s);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_sales_orders_auto_code ON %I.sales_orders', s);
  EXECUTE format('CREATE TRIGGER trg_sales_orders_auto_code BEFORE INSERT ON %I.sales_orders FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_order_code()', s, s);

  RAISE NOTICE '✅ Auto-codes applied: %', s;
END;
$_$;


ALTER FUNCTION platform.fn_apply_auto_codes(p_schema character varying) OWNER TO vanthao;

--
-- Name: fn_apply_business_logic(character varying); Type: FUNCTION; Schema: platform; Owner: vanthao
--

CREATE FUNCTION platform.fn_apply_business_logic(p_schema character varying) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
  s varchar := p_schema;  -- alias ngắn
BEGIN
  RAISE NOTICE '🔧 Applying business logic to schema: %', s;

  -- ══════════════════════════════════════════════════════════
  -- BƯỚC 1: Đảm bảo trigger function tồn tại trong schema
  -- ══════════════════════════════════════════════════════════
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_touch_updated_at()
    RETURNS trigger LANGUAGE plpgsql AS
    'BEGIN NEW.updated_at := now(); RETURN NEW; END;'
  $f$, s);

  -- ══════════════════════════════════════════════════════════
  -- BƯỚC 2: TRIGGER — Đồng bộ thanh toán đơn hàng
  -- INSERT/UPDATE/DELETE trên order_payments
  -- → cập nhật paid_amount + status trên sales_orders
  -- ══════════════════════════════════════════════════════════
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_sync_order_payment()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      v_oid  uuid;
      v_paid numeric(18,2);
      v_gt   numeric(18,2);
      v_st   varchar(30);
    BEGIN
      v_oid := COALESCE(NEW.order_id, OLD.order_id);
      SELECT COALESCE(SUM(p.amount),0), o.grand_total, o.status
      INTO v_paid, v_gt, v_st
      FROM %I.sales_orders o
      LEFT JOIN %I.order_payments p ON p.order_id = o.id AND p.status = 'completed'
      WHERE o.id = v_oid GROUP BY o.grand_total, o.status;

      IF v_st NOT IN ('cancelled','refunded','partial_refund') THEN
        IF    v_paid <= 0          THEN v_st := 'pending';
        ELSIF v_paid < v_gt        THEN v_st := 'partial_paid';
        ELSE                            v_st := 'completed';
        END IF;
      END IF;

      UPDATE %I.sales_orders SET
        paid_amount   = v_paid,
        change_amount = GREATEST(v_paid - v_gt, 0),
        status        = v_st,
        completed_at  = CASE WHEN v_st = 'completed' AND completed_at IS NULL THEN now() ELSE completed_at END,
        updated_at    = now()
      WHERE id = v_oid;
      RETURN COALESCE(NEW, OLD);
    END;$$
  $f$, s, s, s, s);

  EXECUTE format('DROP TRIGGER IF EXISTS trg_order_payments_sync ON %I.order_payments', s);
  EXECUTE format($f$
    CREATE TRIGGER trg_order_payments_sync
    AFTER INSERT OR UPDATE OR DELETE ON %I.order_payments
    FOR EACH ROW EXECUTE FUNCTION %I.fn_sync_order_payment()
  $f$, s, s);

  -- ══════════════════════════════════════════════════════════
  -- BƯỚC 3: TRIGGER — Tự trừ/cộng stock khi hoàn thành đơn
  -- AFTER UPDATE OF status ON sales_orders → completed
  -- → INSERT stock_transactions (sale_out)
  -- ══════════════════════════════════════════════════════════
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_deduct_stock_on_sale()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      r record;
      v_location_id uuid;
    BEGIN
      -- Chỉ xử lý khi chuyển sang completed
      IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
        RETURN NEW;
      END IF;

      -- Lấy location mặc định (is_sellable = true) của store
      SELECT id INTO v_location_id FROM %I.stock_locations
      WHERE store_id = NEW.store_id AND is_sellable = true AND is_active = true
      ORDER BY created_at LIMIT 1;

      IF v_location_id IS NULL THEN RETURN NEW; END IF;

      -- Tạo stock transaction cho từng dòng đơn
      FOR r IN
        SELECT sol.product_id, sol.variant_id, sol.unit_name,
               sol.quantity, sol.cost_price
        FROM %I.sales_order_lines sol
        WHERE sol.order_id = NEW.id
      LOOP
        -- Chỉ trừ kho cho sản phẩm có track_inventory
        IF EXISTS (
          SELECT 1 FROM %I.products
          WHERE id = r.product_id AND track_inventory = true
        ) THEN
          INSERT INTO %I.stock_transactions
            (store_id, location_id, product_id, variant_id, unit_name,
             txn_type, ref_type, ref_id, ref_code, quantity, unit_cost)
          VALUES
            (NEW.store_id, v_location_id, r.product_id, r.variant_id, r.unit_name,
             'sale_out', 'sales_order', NEW.id, NEW.order_code,
             r.quantity, r.cost_price);
        END IF;
      END LOOP;
      RETURN NEW;
    END;$$
  $f$, s, s, s, s, s);

  EXECUTE format('DROP TRIGGER IF EXISTS trg_sales_orders_deduct_stock ON %I.sales_orders', s);
  EXECUTE format($f$
    CREATE TRIGGER trg_sales_orders_deduct_stock
    AFTER UPDATE OF status ON %I.sales_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_deduct_stock_on_sale()
  $f$, s, s);

  -- ══════════════════════════════════════════════════════════
  -- BƯỚC 4: TRIGGER — Đồng bộ stock_balances từ stock_transactions
  -- ══════════════════════════════════════════════════════════
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_sync_stock_balance()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      v_delta   numeric(18,4);
      v_new_qty numeric(18,4);
      v_new_avg numeric(18,4);
      v_cur_qty numeric(18,4);
      v_cur_avg numeric(18,4);
    BEGIN
      v_delta := CASE
        WHEN NEW.txn_type IN ('purchase_in','return_in','transfer_in',
          'adjustment_in','production_in','opening_balance')
        THEN NEW.quantity ELSE -NEW.quantity END;

      SELECT COALESCE(quantity,0), COALESCE(avg_cost,0)
      INTO v_cur_qty, v_cur_avg
      FROM %I.stock_balances
      WHERE location_id = NEW.location_id AND product_id = NEW.product_id
        AND (variant_id = NEW.variant_id OR (variant_id IS NULL AND NEW.variant_id IS NULL))
        AND unit_name = NEW.unit_name;

      v_new_qty := v_cur_qty + v_delta;

      IF v_delta > 0 AND NEW.unit_cost IS NOT NULL AND NEW.unit_cost > 0 THEN
        v_new_avg := CASE WHEN v_cur_qty <= 0 THEN NEW.unit_cost
          ELSE ((v_cur_qty * v_cur_avg) + (v_delta * NEW.unit_cost)) / (v_cur_qty + v_delta)
        END;
      ELSE v_new_avg := v_cur_avg; END IF;

      INSERT INTO %I.stock_balances
        (location_id, product_id, variant_id, unit_name, quantity, avg_cost, last_cost, updated_at)
      VALUES (NEW.location_id, NEW.product_id, NEW.variant_id, NEW.unit_name,
        v_new_qty, v_new_avg, COALESCE(NEW.unit_cost, v_cur_avg), now())
      ON CONFLICT (location_id, product_id, variant_id, unit_name)
      DO UPDATE SET quantity = v_new_qty, avg_cost = v_new_avg,
        last_cost = COALESCE(NEW.unit_cost, EXCLUDED.last_cost), updated_at = now();

      UPDATE %I.stock_transactions
      SET balance_after = v_new_qty,
          total_cost    = COALESCE(NEW.unit_cost, v_cur_avg) * NEW.quantity
      WHERE id = NEW.id;
      RETURN NEW;
    END;$$
  $f$, s, s, s, s);

  EXECUTE format('DROP TRIGGER IF EXISTS trg_stock_transactions_sync ON %I.stock_transactions', s);
  EXECUTE format($f$
    CREATE TRIGGER trg_stock_transactions_sync
    AFTER INSERT ON %I.stock_transactions
    FOR EACH ROW EXECUTE FUNCTION %I.fn_sync_stock_balance()
  $f$, s, s);

  -- ══════════════════════════════════════════════════════════
  -- BƯỚC 5: TRIGGER — Cập nhật thống kê khách hàng
  -- ══════════════════════════════════════════════════════════
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_sync_customer_stats()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.status = 'completed' AND OLD.status <> 'completed' AND NEW.customer_id IS NOT NULL THEN
        UPDATE %I.customers SET
          total_spent    = total_spent + NEW.grand_total,
          visit_count    = visit_count + 1,
          last_visit_at  = now(),
          loyalty_points = loyalty_points + FLOOR(NEW.grand_total / 10000),
          updated_at     = now()
        WHERE id = NEW.customer_id;

        INSERT INTO %I.customer_ledgers
          (customer_id, store_id, txn_type, amount, balance_after, ref_type, ref_id, note)
        VALUES (NEW.customer_id, NEW.store_id, 'purchase', NEW.grand_total,
          (SELECT total_spent FROM %I.customers WHERE id = NEW.customer_id),
          'sales_order', NEW.id, 'Mua hàng đơn ' || NEW.order_code);

        INSERT INTO %I.customer_ledgers
          (customer_id, store_id, txn_type, amount, balance_after, ref_type, ref_id, note)
        SELECT NEW.customer_id, NEW.store_id, 'point_earn', FLOOR(NEW.grand_total/10000),
          (SELECT loyalty_points FROM %I.customers WHERE id = NEW.customer_id),
          'sales_order', NEW.id, 'Tích điểm đơn ' || NEW.order_code
        WHERE FLOOR(NEW.grand_total/10000) > 0;
      END IF;

      IF NEW.status = 'refunded' AND OLD.status = 'completed' AND NEW.customer_id IS NOT NULL THEN
        UPDATE %I.customers SET
          total_spent = GREATEST(total_spent - NEW.grand_total, 0),
          visit_count = GREATEST(visit_count - 1, 0), updated_at = now()
        WHERE id = NEW.customer_id;
      END IF;
      RETURN NEW;
    END;$$
  $f$, s, s, s, s, s, s, s);

  EXECUTE format('DROP TRIGGER IF EXISTS trg_sales_orders_customer_stats ON %I.sales_orders', s);
  EXECUTE format($f$
    CREATE TRIGGER trg_sales_orders_customer_stats
    AFTER UPDATE OF status ON %I.sales_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_sync_customer_stats()
  $f$, s, s);

  -- ══════════════════════════════════════════════════════════
  -- BƯỚC 6: TRIGGER — Đồng bộ công nợ nhà cung cấp
  -- ══════════════════════════════════════════════════════════
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_sync_supplier_debt()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      UPDATE %I.suppliers SET
        total_debt = (
          SELECT COALESCE(SUM(grand_total - paid_amount), 0)
          FROM %I.purchase_orders
          WHERE supplier_id = COALESCE(NEW.supplier_id, OLD.supplier_id)
            AND status NOT IN ('cancelled','closed')
        ), updated_at = now()
      WHERE id = COALESCE(NEW.supplier_id, OLD.supplier_id);
      RETURN COALESCE(NEW, OLD);
    END;$$
  $f$, s, s, s);

  EXECUTE format('DROP TRIGGER IF EXISTS trg_purchase_orders_supplier_debt ON %I.purchase_orders', s);
  EXECUTE format($f$
    CREATE TRIGGER trg_purchase_orders_supplier_debt
    AFTER INSERT OR UPDATE OF paid_amount, status OR DELETE ON %I.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_sync_supplier_debt()
  $f$, s, s);

  -- ══════════════════════════════════════════════════════════
  -- BƯỚC 7: TRIGGER — Tự tạo kitchen ticket khi đơn confirmed (F&B)
  -- ══════════════════════════════════════════════════════════
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_kitchen_ticket()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      v_ticket_id  uuid;
      v_ticket_code varchar(50);
      r record;
    BEGIN
      -- Chỉ tạo cho đơn F&B (table/takeaway) khi chuyển sang confirmed
      IF NEW.status <> 'confirmed' OR OLD.status = 'confirmed' THEN RETURN NEW; END IF;
      IF NEW.order_type NOT IN ('table','takeaway','pos') THEN RETURN NEW; END IF;

      -- Tạo mã ticket
      v_ticket_code := 'KT-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' ||
                       upper(substring(NEW.id::text, 1, 4));

      -- Tạo kitchen ticket
      INSERT INTO %I.kitchen_tickets
        (store_id, order_id, ticket_code, ticket_type, status)
      VALUES (NEW.store_id, NEW.id, v_ticket_code, 'new', 'pending')
      RETURNING id INTO v_ticket_id;

      -- Tạo từng dòng kitchen
      FOR r IN
        SELECT sol.id AS order_line_id, sol.product_name,
               sol.quantity, sol.note, sol.modifiers
        FROM %I.sales_order_lines sol
        WHERE sol.order_id = NEW.id
      LOOP
        INSERT INTO %I.kitchen_ticket_lines
          (ticket_id, order_line_id, product_name, quantity, modifiers, note)
        VALUES (v_ticket_id, r.order_line_id, r.product_name,
                r.quantity, r.modifiers, r.note);
      END LOOP;
      RETURN NEW;
    END;$$
  $f$, s, s, s, s);

  EXECUTE format('DROP TRIGGER IF EXISTS trg_sales_orders_kitchen_ticket ON %I.sales_orders', s);
  EXECUTE format($f$
    CREATE TRIGGER trg_sales_orders_kitchen_ticket
    AFTER UPDATE OF status ON %I.sales_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_kitchen_ticket()
  $f$, s, s);

  -- ══════════════════════════════════════════════════════════
  -- BƯỚC 8: TRIGGER — Tự cập nhật trạng thái bàn (F&B)
  -- ══════════════════════════════════════════════════════════
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_sync_table_status()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.table_id IS NULL THEN RETURN NEW; END IF;

      IF NEW.status IN ('pending','confirmed','processing','partial_paid') THEN
        UPDATE %I.dining_tables SET status = 'occupied', updated_at = now()
        WHERE id = NEW.table_id::uuid;
      ELSIF NEW.status IN ('completed','cancelled','refunded') THEN
        UPDATE %I.dining_tables SET status = 'available', updated_at = now()
        WHERE id = NEW.table_id::uuid
          AND NOT EXISTS (
            SELECT 1 FROM %I.sales_orders o2
            WHERE o2.table_id = NEW.table_id
              AND o2.id <> NEW.id
              AND o2.status IN ('pending','confirmed','processing','partial_paid')
          );
      END IF;
      RETURN NEW;
    END;$$
  $f$, s, s, s, s);

  EXECUTE format('DROP TRIGGER IF EXISTS trg_sales_orders_table_status ON %I.sales_orders', s);
  EXECUTE format($f$
    CREATE TRIGGER trg_sales_orders_table_status
    AFTER INSERT OR UPDATE OF status ON %I.sales_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_sync_table_status()
  $f$, s, s);

  -- ══════════════════════════════════════════════════════════
  -- BƯỚC 9: TRIGGER — Hoàn trả stock khi order bị cancel
  -- ══════════════════════════════════════════════════════════
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_restore_stock_on_cancel()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      r record;
      v_location_id uuid;
    BEGIN
      -- Chỉ khi chuyển từ completed → cancelled/refunded
      IF NEW.status NOT IN ('cancelled','refunded') THEN RETURN NEW; END IF;
      IF OLD.status <> 'completed' THEN RETURN NEW; END IF;

      SELECT id INTO v_location_id FROM %I.stock_locations
      WHERE store_id = NEW.store_id AND is_sellable = true AND is_active = true
      ORDER BY created_at LIMIT 1;
      IF v_location_id IS NULL THEN RETURN NEW; END IF;

      FOR r IN
        SELECT sol.product_id, sol.variant_id, sol.unit_name, sol.quantity
        FROM %I.sales_order_lines sol WHERE sol.order_id = NEW.id
      LOOP
        IF EXISTS (SELECT 1 FROM %I.products WHERE id = r.product_id AND track_inventory = true) THEN
          INSERT INTO %I.stock_transactions
            (store_id, location_id, product_id, variant_id, unit_name,
             txn_type, ref_type, ref_id, ref_code, quantity)
          VALUES
            (NEW.store_id, v_location_id, r.product_id, r.variant_id, r.unit_name,
             'return_in', 'sales_order', NEW.id, NEW.order_code, r.quantity);
        END IF;
      END LOOP;
      RETURN NEW;
    END;$$
  $f$, s, s, s, s, s);

  EXECUTE format('DROP TRIGGER IF EXISTS trg_sales_orders_restore_stock ON %I.sales_orders', s);
  EXECUTE format($f$
    CREATE TRIGGER trg_sales_orders_restore_stock
    AFTER UPDATE OF status ON %I.sales_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_restore_stock_on_cancel()
  $f$, s, s);

  -- ══════════════════════════════════════════════════════════
  -- BƯỚC 10: TRIGGER — Tự cập nhật sub_total / tax / grand_total
  -- khi thêm/sửa/xóa order lines
  -- ══════════════════════════════════════════════════════════
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_recalc_order_totals()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      v_oid uuid;
    BEGIN
      v_oid := COALESCE(NEW.order_id, OLD.order_id);
      UPDATE %I.sales_orders SET
        sub_total = (SELECT COALESCE(SUM(line_total + discount_amount), 0)
                     FROM %I.sales_order_lines WHERE order_id = v_oid),
        discount_amount = (SELECT COALESCE(SUM(discount_amount), 0)
                           FROM %I.sales_order_lines WHERE order_id = v_oid),
        tax_amount = (SELECT COALESCE(SUM(tax_amount), 0)
                      FROM %I.sales_order_lines WHERE order_id = v_oid),
        grand_total = (SELECT COALESCE(SUM(line_total), 0)
                       FROM %I.sales_order_lines WHERE order_id = v_oid),
        updated_at = now()
      WHERE id = v_oid;
      RETURN COALESCE(NEW, OLD);
    END;$$
  $f$, s, s, s, s, s, s);

  EXECUTE format('DROP TRIGGER IF EXISTS trg_order_lines_recalc ON %I.sales_order_lines', s);
  EXECUTE format($f$
    CREATE TRIGGER trg_order_lines_recalc
    AFTER INSERT OR UPDATE OR DELETE ON %I.sales_order_lines
    FOR EACH ROW EXECUTE FUNCTION %I.fn_recalc_order_totals()
  $f$, s, s);

  -- ══════════════════════════════════════════════════════════
  -- BƯỚC 11: TRIGGER — Auto tạo document_sequence số đơn hàng
  -- ══════════════════════════════════════════════════════════
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION %I.fn_auto_order_code()
    RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE
      v_next   bigint;
      v_prefix varchar;
      v_pad    integer;
    BEGIN
      IF NEW.order_code IS NOT NULL AND NEW.order_code <> '' THEN RETURN NEW; END IF;

      -- Lấy / tạo sequence config cho loại đơn
      INSERT INTO %I.document_sequences (store_id, doc_type, prefix, pad_length, last_number)
      VALUES (NEW.store_id, 'sales_order', 'SO', 6, 0)
      ON CONFLICT (store_id, doc_type) DO NOTHING;

      UPDATE %I.document_sequences
      SET last_number = last_number + 1, updated_at = now()
      WHERE store_id = NEW.store_id AND doc_type = 'sales_order'
      RETURNING last_number, prefix, pad_length INTO v_next, v_prefix, v_pad;

      NEW.order_code := v_prefix || to_char(now(), 'YYMMDD') ||
                        lpad(v_next::text, v_pad, '0');
      RETURN NEW;
    END;$$
  $f$, s, s, s);

  EXECUTE format('DROP TRIGGER IF EXISTS trg_sales_orders_auto_code ON %I.sales_orders', s);
  EXECUTE format($f$
    CREATE TRIGGER trg_sales_orders_auto_code
    BEFORE INSERT ON %I.sales_orders
    FOR EACH ROW EXECUTE FUNCTION %I.fn_auto_order_code()
  $f$, s, s);

  -- ══════════════════════════════════════════════════════════
  -- BƯỚC 12: VIEWS BÁO CÁO
  -- ══════════════════════════════════════════════════════════

  -- Xóa views cũ để tạo lại
  EXECUTE format('DROP VIEW IF EXISTS %I.v_product_stock CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_daily_sales CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_low_stock CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_shift_summary CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_customer_ranking CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_product_sales_summary CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_outstanding_po CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_cash_flow_daily CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_table_status CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_revenue_by_hour CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_payment_method_summary CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_staff_performance CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_inventory_movement CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_profit_by_product CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_open_orders CASCADE', s);
  EXECUTE format('DROP VIEW IF EXISTS %I.v_register_summary CASCADE', s);

  -- v_product_stock
  EXECUTE format($v$
    CREATE VIEW %I.v_product_stock AS
    SELECT sb.product_id, p.product_code, p.product_name, sb.variant_id, pv.variant_name,
      sl.store_id, sl.id AS location_id, sl.location_name, sb.unit_name,
      sb.quantity, sb.reserved_qty, (sb.quantity - sb.reserved_qty) AS available_qty,
      sb.avg_cost, sb.updated_at
    FROM %I.stock_balances sb
    JOIN %I.products p ON p.id = sb.product_id
    JOIN %I.stock_locations sl ON sl.id = sb.location_id
    LEFT JOIN %I.product_variants pv ON pv.id = sb.variant_id
  $v$, s, s, s, s, s);

  -- v_daily_sales
  EXECUTE format($v$
    CREATE VIEW %I.v_daily_sales AS
    SELECT store_id,
      DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS sale_date,
      COUNT(*) AS order_count, SUM(grand_total) AS total_revenue,
      SUM(discount_amount) AS total_discount, SUM(tax_amount) AS total_tax,
      AVG(grand_total) AS avg_order_value
    FROM %I.sales_orders WHERE status IN ('completed','partial_refund')
    GROUP BY store_id, DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
  $v$, s, s);

  -- v_low_stock
  EXECUTE format($v$
    CREATE VIEW %I.v_low_stock AS
    SELECT p.id AS product_id, p.product_code, p.product_name, pv.id AS variant_id, pv.variant_name,
      sl.store_id, sl.id AS location_id, sl.location_name, sb.unit_name,
      sb.quantity, sb.reserved_qty, (sb.quantity - sb.reserved_qty) AS available_qty,
      p.min_stock_level,
      CASE WHEN (sb.quantity - sb.reserved_qty) <= 0 THEN 'out_of_stock'
           WHEN (sb.quantity - sb.reserved_qty) <= p.min_stock_level THEN 'low_stock'
           ELSE 'ok' END AS stock_status
    FROM %I.stock_balances sb
    JOIN %I.products p ON p.id = sb.product_id AND p.track_inventory = true AND p.min_stock_level IS NOT NULL
    JOIN %I.stock_locations sl ON sl.id = sb.location_id
    LEFT JOIN %I.product_variants pv ON pv.id = sb.variant_id
    WHERE (sb.quantity - sb.reserved_qty) <= p.min_stock_level
  $v$, s, s, s, s, s);

  -- v_open_orders (mới — đơn đang xử lý)
  EXECUTE format($v$
    CREATE VIEW %I.v_open_orders AS
    SELECT so.id, so.store_id, so.register_id, so.order_code, so.order_type, so.status,
      so.customer_id, so.customer_name, so.cashier_id, sm.full_name AS cashier_name,
      so.table_id, so.table_name, so.sub_total, so.discount_amount,
      so.tax_amount, so.grand_total, so.paid_amount,
      (so.grand_total - so.paid_amount) AS remaining_amount,
      so.loyalty_points_used, so.note, so.created_at,
      EXTRACT(EPOCH FROM (now() - so.created_at))/60 AS minutes_since_created
    FROM %I.sales_orders so
    LEFT JOIN %I.staff_members sm ON sm.id = so.cashier_id
    WHERE so.status IN ('pending','confirmed','processing','ready','partial_paid')
  $v$, s, s, s, s);

  -- v_shift_summary
  EXECUTE format($v$
    CREATE VIEW %I.v_shift_summary AS
    SELECT ws.id AS shift_id, ws.store_id, ws.staff_id, sm.full_name AS staff_name,
      ws.shift_date, ws.planned_start, ws.planned_end, ws.actual_start, ws.actual_end, ws.status,
      COALESCE(ord.order_count,0) AS order_count,
      COALESCE(ord.total_revenue,0) AS total_revenue,
      COALESCE(ord.total_discount,0) AS total_discount,
      EXTRACT(EPOCH FROM (ws.actual_end - ws.actual_start))/3600.0 AS worked_hours
    FROM %I.work_shifts ws
    LEFT JOIN %I.staff_members sm ON sm.id = ws.staff_id
    LEFT JOIN (
      SELECT shift_id, COUNT(*) AS order_count,
        SUM(grand_total) AS total_revenue, SUM(discount_amount) AS total_discount
      FROM %I.sales_orders WHERE status IN ('completed','partial_refund') GROUP BY shift_id
    ) ord ON ord.shift_id = ws.id
  $v$, s, s, s, s, s);

  -- v_customer_ranking
  EXECUTE format($v$
    CREATE VIEW %I.v_customer_ranking AS
    SELECT c.id AS customer_id, c.customer_code, c.full_name, c.phone, cg.group_name,
      c.loyalty_points, c.total_spent, c.visit_count, c.last_visit_at, c.status,
      RANK() OVER (ORDER BY c.total_spent DESC) AS rank_by_spend,
      RANK() OVER (ORDER BY c.visit_count DESC) AS rank_by_visits
    FROM %I.customers c LEFT JOIN %I.customer_groups cg ON cg.id = c.group_id
    WHERE c.status = 'active'
  $v$, s, s, s);

  -- v_product_sales_summary
  EXECUTE format($v$
    CREATE VIEW %I.v_product_sales_summary AS
    SELECT sol.product_id, p.product_code, p.product_name, sol.variant_id, pv.variant_name,
      so.store_id, DATE_TRUNC('month', so.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS month,
      SUM(sol.quantity) AS total_qty_sold, SUM(sol.line_total) AS total_revenue,
      SUM(sol.line_total - COALESCE(sol.cost_price,0)*sol.quantity) AS gross_profit,
      COUNT(DISTINCT so.id) AS order_count
    FROM %I.sales_order_lines sol
    JOIN %I.sales_orders so ON so.id = sol.order_id AND so.status IN ('completed','partial_refund')
    JOIN %I.products p ON p.id = sol.product_id
    LEFT JOIN %I.product_variants pv ON pv.id = sol.variant_id
    GROUP BY sol.product_id, p.product_code, p.product_name,
      sol.variant_id, pv.variant_name, so.store_id,
      DATE_TRUNC('month', so.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
  $v$, s, s, s, s, s);

  -- v_profit_by_product
  EXECUTE format($v$
    CREATE VIEW %I.v_profit_by_product AS
    SELECT so.store_id, sol.product_id, p.product_code, p.product_name, p.product_type,
      pc.category_name, sol.variant_id, pv.variant_name,
      DATE_TRUNC('month', so.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS month,
      SUM(sol.quantity) AS qty_sold, SUM(sol.line_total) AS revenue,
      SUM(sol.discount_amount) AS total_discount, SUM(sol.tax_amount) AS total_tax,
      SUM(COALESCE(sol.cost_price,0)*sol.quantity) AS total_cogs,
      SUM(sol.line_total) - SUM(COALESCE(sol.cost_price,0)*sol.quantity) AS gross_profit,
      CASE WHEN SUM(sol.line_total) = 0 THEN 0
        ELSE ROUND((SUM(sol.line_total)-SUM(COALESCE(sol.cost_price,0)*sol.quantity))*100.0/SUM(sol.line_total),2)
      END AS gross_margin_pct
    FROM %I.sales_order_lines sol
    JOIN %I.sales_orders so ON so.id = sol.order_id AND so.status IN ('completed','partial_refund')
    JOIN %I.products p ON p.id = sol.product_id
    LEFT JOIN %I.product_categories pc ON pc.id = p.category_id
    LEFT JOIN %I.product_variants pv ON pv.id = sol.variant_id
    GROUP BY so.store_id, sol.product_id, p.product_code, p.product_name, p.product_type,
      pc.category_name, sol.variant_id, pv.variant_name,
      DATE_TRUNC('month', so.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
  $v$, s, s, s, s, s, s);

  -- v_outstanding_po
  EXECUTE format($v$
    CREATE VIEW %I.v_outstanding_po AS
    SELECT po.id AS po_id, po.po_code, po.store_id, sup.supplier_name, sup.phone,
      po.status, po.order_date, po.expected_date, po.grand_total, po.paid_amount,
      (po.grand_total - po.paid_amount) AS remaining_payment,
      pol.product_id, p.product_name, pol.unit_name,
      pol.ordered_qty, pol.received_qty, (pol.ordered_qty - pol.received_qty) AS pending_qty
    FROM %I.purchase_orders po
    JOIN %I.suppliers sup ON sup.id = po.supplier_id
    JOIN %I.purchase_order_lines pol ON pol.po_id = po.id
    JOIN %I.products p ON p.id = pol.product_id
    WHERE po.status IN ('confirmed','partial_received') AND pol.received_qty < pol.ordered_qty
  $v$, s, s, s, s, s);

  -- v_cash_flow_daily
  EXECUTE format($v$
    CREATE VIEW %I.v_cash_flow_daily AS
    SELECT ct.store_id, ct.cash_account_id, ca.account_name, ca.account_type,
      DATE(ct.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS txn_date, ct.txn_type,
      COUNT(*) AS txn_count,
      SUM(CASE WHEN ct.txn_type IN ('sale_in','return_in','deposit','transfer_in') THEN ct.amount ELSE 0 END) AS total_in,
      SUM(CASE WHEN ct.txn_type IN ('purchase_out','return_out','withdrawal','transfer_out','expense') THEN ct.amount ELSE 0 END) AS total_out
    FROM %I.cash_transactions ct
    JOIN %I.cash_accounts ca ON ca.id = ct.cash_account_id
    GROUP BY ct.store_id, ct.cash_account_id, ca.account_name, ca.account_type,
      DATE(ct.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), ct.txn_type
  $v$, s, s, s);

  -- v_table_status
  EXECUTE format($v$
    CREATE VIEW %I.v_table_status AS
    SELECT dt.id AS table_id, dt.store_id, fp.floor_name, dt.table_code, dt.table_name,
      dt.capacity, dt.status AS table_status,
      ts.id AS active_session_id, ts.session_code, ts.party_size, ts.opened_at,
      EXTRACT(EPOCH FROM (now()-ts.opened_at))/60.0 AS minutes_occupied,
      ts.order_id, so.grand_total AS current_bill, ts.opened_by,
      sm.full_name AS opened_by_name
    FROM %I.dining_tables dt
    LEFT JOIN %I.floor_plans fp ON fp.id = dt.floor_id
    LEFT JOIN %I.table_sessions ts ON ts.table_id = dt.id AND ts.status = 'open'
    LEFT JOIN %I.sales_orders so ON so.id = ts.order_id
    LEFT JOIN %I.staff_members sm ON sm.id = ts.opened_by
  $v$, s, s, s, s, s, s);

  -- v_revenue_by_hour
  EXECUTE format($v$
    CREATE VIEW %I.v_revenue_by_hour AS
    SELECT store_id,
      DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS sale_date,
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS hour_of_day,
      COUNT(*) AS order_count, SUM(grand_total) AS total_revenue, AVG(grand_total) AS avg_order_value
    FROM %I.sales_orders WHERE status IN ('completed','partial_refund')
    GROUP BY store_id, DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh'),
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
  $v$, s, s);

  -- v_payment_method_summary
  EXECUTE format($v$
    CREATE VIEW %I.v_payment_method_summary AS
    SELECT so.store_id, DATE(op.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS txn_date,
      op.method_code, op.method_name, COUNT(*) AS txn_count, SUM(op.amount) AS total_amount,
      ROUND(SUM(op.amount)*100.0/SUM(SUM(op.amount)) OVER (
        PARTITION BY so.store_id, DATE(op.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')),2) AS pct_of_daily_revenue
    FROM %I.order_payments op
    JOIN %I.sales_orders so ON so.id = op.order_id
    WHERE op.status = 'completed' AND so.status IN ('completed','partial_refund')
    GROUP BY so.store_id, DATE(op.paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), op.method_code, op.method_name
  $v$, s, s, s);

  -- v_staff_performance
  EXECUTE format($v$
    CREATE VIEW %I.v_staff_performance AS
    SELECT so.store_id, so.cashier_id AS staff_id, sm.full_name AS staff_name, sm.position,
      DATE(so.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS sale_date, so.shift_id,
      COUNT(so.id) AS order_count, SUM(so.grand_total) AS total_revenue,
      SUM(so.discount_amount) AS total_discount, AVG(so.grand_total) AS avg_order_value
    FROM %I.sales_orders so
    JOIN %I.staff_members sm ON sm.id = so.cashier_id
    WHERE so.status IN ('completed','partial_refund') AND so.cashier_id IS NOT NULL
    GROUP BY so.store_id, so.cashier_id, sm.full_name, sm.position,
      DATE(so.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh'), so.shift_id
  $v$, s, s, s);

  -- v_inventory_movement
  EXECUTE format($v$
    CREATE VIEW %I.v_inventory_movement AS
    SELECT st.store_id, st.location_id, sl.location_name, st.product_id,
      p.product_code, p.product_name, st.variant_id, pv.variant_name, st.unit_name,
      DATE_TRUNC('month', st.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AS month,
      SUM(CASE WHEN st.txn_type IN ('purchase_in','return_in','transfer_in','adjustment_in','production_in','opening_balance')
        THEN st.quantity ELSE 0 END) AS total_in,
      SUM(CASE WHEN st.txn_type IN ('sale_out','return_out','transfer_out','adjustment_out','production_out')
        THEN st.quantity ELSE 0 END) AS total_out,
      SUM(CASE WHEN st.txn_type IN ('purchase_in','return_in','transfer_in','adjustment_in','production_in','opening_balance')
        THEN st.quantity ELSE -st.quantity END) AS net_movement,
      SUM(COALESCE(st.total_cost,0)) AS total_cost_value
    FROM %I.stock_transactions st
    JOIN %I.stock_locations sl ON sl.id = st.location_id
    JOIN %I.products p ON p.id = st.product_id
    LEFT JOIN %I.product_variants pv ON pv.id = st.variant_id
    GROUP BY st.store_id, st.location_id, sl.location_name, st.product_id,
      p.product_code, p.product_name, st.variant_id, pv.variant_name, st.unit_name,
      DATE_TRUNC('month', st.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')
  $v$, s, s, s, s, s);

  -- v_register_summary (mới — tổng kết quầy thu ngân)
  EXECUTE format($v$
    CREATE VIEW %I.v_register_summary AS
    SELECT r.id AS register_id, r.store_id, r.register_code, r.register_name,
      r.status, r.last_open_at, sm.full_name AS current_staff,
      COALESCE(today.order_count, 0)    AS today_orders,
      COALESCE(today.total_revenue, 0)  AS today_revenue,
      COALESCE(open_ord.open_count, 0)  AS open_order_count
    FROM %I.registers r
    LEFT JOIN %I.staff_members sm ON sm.id = r.current_staff_id
    LEFT JOIN (
      SELECT register_id, COUNT(*) AS order_count, SUM(grand_total) AS total_revenue
      FROM %I.sales_orders
      WHERE status IN ('completed','partial_refund')
        AND DATE(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = CURRENT_DATE
      GROUP BY register_id
    ) today ON today.register_id = r.id
    LEFT JOIN (
      SELECT register_id, COUNT(*) AS open_count
      FROM %I.sales_orders
      WHERE status IN ('pending','confirmed','processing','partial_paid')
      GROUP BY register_id
    ) open_ord ON open_ord.register_id = r.id
  $v$, s, s, s, s, s);

  RAISE NOTICE '✅ Schema "%" — Business logic applied: 8 triggers, 14 views', s;
END;
$_$;


ALTER FUNCTION platform.fn_apply_business_logic(p_schema character varying) OWNER TO vanthao;

--
-- Name: FUNCTION fn_apply_business_logic(p_schema character varying); Type: COMMENT; Schema: platform; Owner: vanthao
--

COMMENT ON FUNCTION platform.fn_apply_business_logic(p_schema character varying) IS 'Áp dụng toàn bộ triggers + views cho 1 tenant schema. Gọi khi provision hoặc upgrade.';


--
-- Name: fn_assign_tenant_code_and_schema_name(); Type: FUNCTION; Schema: platform; Owner: vanthao
--

CREATE FUNCTION platform.fn_assign_tenant_code_and_schema_name() RETURNS trigger
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


ALTER FUNCTION platform.fn_assign_tenant_code_and_schema_name() OWNER TO vanthao;

--
-- Name: fn_next_tenant_code(); Type: FUNCTION; Schema: platform; Owner: vanthao
--

CREATE FUNCTION platform.fn_next_tenant_code() RETURNS character varying
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


ALTER FUNCTION platform.fn_next_tenant_code() OWNER TO vanthao;

--
-- Name: fn_provision_tenant(character varying, character varying, character varying, character varying, character varying, character varying, character varying); Type: FUNCTION; Schema: platform; Owner: vanthao
--

CREATE FUNCTION platform.fn_provision_tenant(p_tenant_code character varying, p_legal_name character varying, p_brand_name character varying DEFAULT NULL::character varying, p_email character varying DEFAULT NULL::character varying, p_phone character varying DEFAULT NULL::character varying, p_plan character varying DEFAULT 'standard'::character varying, p_timezone character varying DEFAULT 'Asia/Ho_Chi_Minh'::character varying) RETURNS TABLE(new_tenant_id uuid, new_schema_name character varying, result_status character varying)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
DECLARE
  v_tenant_id      uuid;
  v_schema         varchar;
  v_schema_created boolean := false;
  v_table          record;
  v_idx            record;
  v_sql            text;
  v_tenant_tables  text[];
BEGIN
  IF p_tenant_code !~ '^[a-z0-9_]{3,50}$' THEN
    RAISE EXCEPTION 'tenant_code không hợp lệ: %', p_tenant_code;
  END IF;
  v_schema := 'tenant_' || p_tenant_code;

  IF EXISTS (SELECT 1 FROM information_schema.schemata s WHERE s.schema_name = v_schema) THEN
    RAISE EXCEPTION 'Schema "%" đã tồn tại.', v_schema;
  END IF;
  IF EXISTS (SELECT 1 FROM platform.tenants t WHERE t.tenant_code = p_tenant_code) THEN
    RAISE EXCEPTION 'tenant_code "%" đã được đăng ký.', p_tenant_code;
  END IF;

  EXECUTE format('CREATE SCHEMA %I', v_schema);
  EXECUTE format('ALTER SCHEMA %I OWNER TO vanthao', v_schema);
  v_schema_created := true;

  SELECT ARRAY(SELECT t.table_name::text FROM information_schema.tables t
    WHERE t.table_schema = 'tenant_template' AND t.table_type = 'BASE TABLE')
  INTO v_tenant_tables;

  FOR v_table IN
    SELECT t.table_name FROM information_schema.tables t
    WHERE t.table_schema = 'tenant_template' AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    EXECUTE format('CREATE TABLE %I.%I (LIKE tenant_template.%I INCLUDING ALL)',
      v_schema, v_table.table_name, v_table.table_name);
    EXECUTE format('ALTER TABLE %I.%I OWNER TO vanthao', v_schema, v_table.table_name);
  END LOOP;

  FOR v_idx IN
    SELECT tc.constraint_name, tc.table_name AS src_table, kcu.column_name AS src_col,
      ccu.table_name AS ref_table, ccu.column_name AS ref_col, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name AND rc.constraint_schema = tc.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = rc.unique_constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'tenant_template'
    ORDER BY tc.table_name, tc.constraint_name
  LOOP
    IF v_idx.ref_table = ANY(v_tenant_tables) THEN
      v_sql := format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %I.%I(%I)',
        v_schema, v_idx.src_table, v_idx.constraint_name, v_idx.src_col,
        v_schema, v_idx.ref_table, v_idx.ref_col);
      IF v_idx.delete_rule <> 'NO ACTION' THEN
        v_sql := v_sql || ' ON DELETE ' || v_idx.delete_rule;
      END IF;
      BEGIN EXECUTE v_sql; EXCEPTION WHEN duplicate_object THEN NULL; END;
    END IF;
  END LOOP;

  INSERT INTO platform.tenants (
    tenant_code, schema_name, legal_name, brand_name,
    email, phone, subscription_plan, timezone_name, status
  ) VALUES (
    p_tenant_code, v_schema, p_legal_name, p_brand_name,
    p_email, p_phone, p_plan, p_timezone, 'trial'
  ) RETURNING id INTO v_tenant_id;

  -- ✅ Tự động áp dụng toàn bộ business logic
  PERFORM platform.fn_apply_business_logic(v_schema);

  RAISE NOTICE '✅ Tenant "%" tạo xong! Schema: % | ID: %', p_tenant_code, v_schema, v_tenant_id;
  RETURN QUERY SELECT v_tenant_id, v_schema::varchar, 'created'::varchar;

EXCEPTION WHEN OTHERS THEN
  IF v_schema_created THEN
    EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', v_schema);
    RAISE NOTICE '⚠️ Đã rollback schema "%"', v_schema;
  END IF;
  RAISE;
END;
$_$;


ALTER FUNCTION platform.fn_provision_tenant(p_tenant_code character varying, p_legal_name character varying, p_brand_name character varying, p_email character varying, p_phone character varying, p_plan character varying, p_timezone character varying) OWNER TO vanthao;

--
-- Name: FUNCTION fn_provision_tenant(p_tenant_code character varying, p_legal_name character varying, p_brand_name character varying, p_email character varying, p_phone character varying, p_plan character varying, p_timezone character varying); Type: COMMENT; Schema: platform; Owner: vanthao
--

COMMENT ON FUNCTION platform.fn_provision_tenant(p_tenant_code character varying, p_legal_name character varying, p_brand_name character varying, p_email character varying, p_phone character varying, p_plan character varying, p_timezone character varying) IS 'Provision tenant mới: clone tenant_template → schema tenant_{code}, đăng ký platform.tenants. Safe rollback.';


--
-- Name: fn_touch_updated_at(); Type: FUNCTION; Schema: platform; Owner: vanthao
--

CREATE FUNCTION platform.fn_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION platform.fn_touch_updated_at() OWNER TO vanthao;

--
-- Name: fn_upgrade_all_tenants(); Type: FUNCTION; Schema: platform; Owner: vanthao
--

CREATE FUNCTION platform.fn_upgrade_all_tenants() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE r record;
BEGIN
  RAISE NOTICE '🚀 Upgrading all tenants...';
  PERFORM platform.fn_apply_business_logic('tenant_template');
  PERFORM platform.fn_apply_auto_codes('tenant_template');
  FOR r IN
    SELECT schema_name, tenant_code FROM platform.tenants
    WHERE status NOT IN ('suspended','deleted')
    ORDER BY created_at
  LOOP
    PERFORM platform.fn_apply_business_logic(r.schema_name);
    PERFORM platform.fn_apply_auto_codes(r.schema_name);
    RAISE NOTICE '  ✅ % (%)', r.tenant_code, r.schema_name;
  END LOOP;
  RAISE NOTICE '🎉 Done: % tenant(s)',
    (SELECT COUNT(*) FROM platform.tenants WHERE status NOT IN ('suspended','deleted'));
END;
$$;


ALTER FUNCTION platform.fn_upgrade_all_tenants() OWNER TO vanthao;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_branch_access; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.account_branch_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_tenant_id uuid NOT NULL,
    tenant_branch_id uuid NOT NULL,
    access_level character varying(30) NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_aba_access CHECK (((access_level)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying, 'cashier'::character varying, 'inventory'::character varying, 'auditor'::character varying, 'api'::character varying, 'staff'::character varying])::text[]))),
    CONSTRAINT chk_aba_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'disabled'::character varying])::text[])))
);


ALTER TABLE platform.account_branch_access OWNER TO vanthao;

--
-- Name: account_mfa_methods; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.account_mfa_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    method_type character varying(30) NOT NULL,
    method_label character varying(100),
    secret_hash character varying(255),
    target_masked character varying(255),
    is_primary boolean DEFAULT false NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_mfa_method_type CHECK (((method_type)::text = ANY ((ARRAY['totp'::character varying, 'sms'::character varying, 'email'::character varying, 'backup_code'::character varying])::text[]))),
    CONSTRAINT chk_mfa_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'revoked'::character varying])::text[])))
);


ALTER TABLE platform.account_mfa_methods OWNER TO vanthao;

--
-- Name: account_role_bindings; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.account_role_bindings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    role_id uuid NOT NULL,
    scope_type character varying(20) NOT NULL,
    scope_id uuid,
    support_grant_until timestamp with time zone,
    granted_by_account_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_arb_scope CHECK (((scope_type)::text = ANY ((ARRAY['platform'::character varying, 'tenant'::character varying, 'store'::character varying])::text[])))
);


ALTER TABLE platform.account_role_bindings OWNER TO vanthao;

--
-- Name: account_tenants; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.account_tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    access_level character varying(30) DEFAULT 'staff'::character varying NOT NULL,
    default_branch_code character varying(50),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_at_access CHECK (((access_level)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'manager'::character varying, 'cashier'::character varying, 'inventory'::character varying, 'auditor'::character varying, 'api'::character varying, 'staff'::character varying])::text[]))),
    CONSTRAINT chk_at_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'disabled'::character varying])::text[])))
);


ALTER TABLE platform.account_tenants OWNER TO vanthao;

--
-- Name: accounts; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username character varying(80) NOT NULL,
    password character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(30),
    avatar_url character varying(500),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    is_platform_admin boolean DEFAULT false NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_accounts_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'active'::character varying, 'locked'::character varying, 'disabled'::character varying])::text[])))
);


ALTER TABLE platform.accounts OWNER TO vanthao;

--
-- Name: api_clients; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.api_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    client_code character varying(50) NOT NULL,
    client_name character varying(255) NOT NULL,
    api_key_hash character varying(255) NOT NULL,
    scopes jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_api_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'disabled'::character varying, 'expired'::character varying])::text[])))
);


ALTER TABLE platform.api_clients OWNER TO vanthao;

--
-- Name: audit_events; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.audit_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    account_id uuid,
    event_type character varying(50) NOT NULL,
    object_type character varying(50) NOT NULL,
    object_id character varying(100),
    event_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE platform.audit_events OWNER TO vanthao;

--
-- Name: auth_sessions; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.auth_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid NOT NULL,
    device_identity_id uuid,
    tenant_id uuid,
    session_token_hash character varying(255) NOT NULL,
    refresh_token_hash character varying(255),
    login_method character varying(30) DEFAULT 'password'::character varying NOT NULL,
    session_status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    ip_address character varying(100),
    user_agent character varying(1000),
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_login_method CHECK (((login_method)::text = ANY ((ARRAY['password'::character varying, 'otp'::character varying, 'social'::character varying, 'api_key'::character varying, 'sso'::character varying])::text[]))),
    CONSTRAINT chk_session_status CHECK (((session_status)::text = ANY ((ARRAY['active'::character varying, 'expired'::character varying, 'revoked'::character varying, 'locked'::character varying])::text[])))
);


ALTER TABLE platform.auth_sessions OWNER TO vanthao;

--
-- Name: bank_master; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.bank_master (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bank_code character varying(30) NOT NULL,
    bank_bin character varying(20),
    bank_name character varying(255) NOT NULL,
    short_name character varying(100),
    logo_url character varying(500),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE platform.bank_master OWNER TO vanthao;

--
-- Name: crm_role_permissions; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.crm_role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_key character varying(100) NOT NULL,
    permission_key character varying(120) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE platform.crm_role_permissions OWNER TO vanthao;

--
-- Name: device_identities; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.device_identities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id uuid,
    device_uid character varying(120) NOT NULL,
    device_name character varying(255),
    device_type character varying(30) NOT NULL,
    client_type character varying(30) NOT NULL,
    os_name character varying(50),
    os_version character varying(50),
    app_version character varying(50),
    fingerprint_hash character varying(255),
    trusted_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    last_seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_client_type CHECK (((client_type)::text = ANY ((ARRAY['pos'::character varying, 'web_admin'::character varying, 'web_customer'::character varying, 'mobile_staff'::character varying, 'mobile_customer'::character varying])::text[]))),
    CONSTRAINT chk_device_type CHECK (((device_type)::text = ANY ((ARRAY['pos_terminal'::character varying, 'tablet'::character varying, 'phone'::character varying, 'desktop'::character varying, 'kiosk'::character varying, 'printer_box'::character varying])::text[]))),
    CONSTRAINT chk_trusted_status CHECK (((trusted_status)::text = ANY ((ARRAY['pending'::character varying, 'trusted'::character varying, 'blocked'::character varying])::text[])))
);


ALTER TABLE platform.device_identities OWNER TO vanthao;

--
-- Name: flyway_schema_history; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.flyway_schema_history (
    installed_rank integer NOT NULL,
    version character varying(50),
    description character varying(200) NOT NULL,
    type character varying(20) NOT NULL,
    script character varying(1000) NOT NULL,
    checksum integer,
    installed_by character varying(100) NOT NULL,
    installed_on timestamp without time zone DEFAULT now() NOT NULL,
    execution_time integer NOT NULL,
    success boolean NOT NULL
);


ALTER TABLE platform.flyway_schema_history OWNER TO vanthao;

--
-- Name: permissions; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    permission_key character varying(150) NOT NULL,
    permission_name character varying(150) NOT NULL,
    module_key character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE platform.permissions OWNER TO vanthao;

--
-- Name: role_permissions; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE platform.role_permissions OWNER TO vanthao;

--
-- Name: roles; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role_key character varying(100) NOT NULL,
    role_name character varying(150) NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    role_scope character varying(20) NOT NULL,
    sort_order integer DEFAULT 900 NOT NULL,
    CONSTRAINT chk_platform_roles_scope CHECK ((lower((role_scope)::text) = ANY (ARRAY['platform'::text, 'tenant'::text])))
);


ALTER TABLE platform.roles OWNER TO vanthao;

--
-- Name: tenant_branches; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.tenant_branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    branch_code character varying(50) NOT NULL,
    branch_name character varying(255) NOT NULL,
    source_schema_name character varying(63) NOT NULL,
    source_branch_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE platform.tenant_branches OWNER TO vanthao;

--
-- Name: tenant_code_seq; Type: SEQUENCE; Schema: platform; Owner: vanthao
--

CREATE SEQUENCE platform.tenant_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE platform.tenant_code_seq OWNER TO vanthao;

--
-- Name: tenants; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_code character varying(50) NOT NULL,
    schema_name character varying(63) NOT NULL,
    legal_name character varying(255) NOT NULL,
    brand_name character varying(255),
    subscription_plan character varying(50) DEFAULT 'standard'::character varying NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    timezone_name character varying(100) DEFAULT 'Asia/Ho_Chi_Minh'::character varying NOT NULL,
    currency_code character(3) DEFAULT 'VND'::bpchar NOT NULL,
    phone character varying(30),
    email character varying(255),
    tax_code character varying(50),
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    store_public_code character varying(12),
    CONSTRAINT chk_tenants_status CHECK (((status)::text = ANY ((ARRAY['trial'::character varying, 'active'::character varying, 'suspended'::character varying, 'closed'::character varying])::text[])))
);


ALTER TABLE platform.tenants OWNER TO vanthao;

--
-- Name: v_accounts_basic; Type: VIEW; Schema: platform; Owner: vanthao
--

CREATE VIEW platform.v_accounts_basic AS
 SELECT id,
    username,
    full_name,
    email,
    phone,
    status,
    is_platform_admin,
    created_at,
    updated_at
   FROM platform.accounts;


ALTER VIEW platform.v_accounts_basic OWNER TO vanthao;

--
-- Name: VIEW v_accounts_basic; Type: COMMENT; Schema: platform; Owner: vanthao
--

COMMENT ON VIEW platform.v_accounts_basic IS 'Lightweight read model — không expose password hash.';


--
-- Name: v_crm_alert_items; Type: VIEW; Schema: platform; Owner: vanthao
--

CREATE VIEW platform.v_crm_alert_items AS
 SELECT 'notification'::character varying(20) AS alert_group,
    'warning'::character varying(20) AS severity,
    'TENANT_TRIAL'::character varying(60) AS alert_code,
    t.tenant_code,
    (('Tenant '::text || (t.tenant_code)::text) || ' dang o trang thai trial'::text) AS title,
    'Trial'::character varying(30) AS status_label,
    t.updated_at AS event_time
   FROM platform.tenants t
  WHERE (lower((t.status)::text) = 'trial'::text)
UNION ALL
 SELECT 'notification'::character varying(20) AS alert_group,
    'critical'::character varying(20) AS severity,
    'TENANT_SUSPENDED'::character varying(60) AS alert_code,
    t.tenant_code,
    (('Tenant '::text || (t.tenant_code)::text) || ' dang bi tam ngung'::text) AS title,
    'Suspended'::character varying(30) AS status_label,
    t.updated_at AS event_time
   FROM platform.tenants t
  WHERE (lower((t.status)::text) = 'suspended'::text)
UNION ALL
 SELECT 'ticket'::character varying(20) AS alert_group,
    (
        CASE
            WHEN (lower((at.status)::text) = 'disabled'::text) THEN 'high'::text
            ELSE 'medium'::text
        END)::character varying(20) AS severity,
    (('ACCOUNT_TENANT_'::text || upper((at.status)::text)))::character varying(60) AS alert_code,
    t.tenant_code,
    ((((('Tai khoan '::text || (a.username)::text) || ' o tenant '::text) || (t.tenant_code)::text) || ' co trang thai '::text) || (at.status)::text) AS title,
    (initcap((at.status)::text))::character varying(30) AS status_label,
    COALESCE(a.last_login_at, t.updated_at) AS event_time
   FROM ((platform.account_tenants at
     JOIN platform.tenants t ON ((t.id = at.tenant_id)))
     JOIN platform.accounts a ON ((a.id = at.account_id)))
  WHERE (lower((at.status)::text) <> 'active'::text);


ALTER VIEW platform.v_crm_alert_items OWNER TO vanthao;

--
-- Name: v_crm_recent_activities; Type: VIEW; Schema: platform; Owner: vanthao
--

CREATE VIEW platform.v_crm_recent_activities AS
 SELECT 'TENANT_UPDATED'::character varying(60) AS activity_type,
    'system'::character varying(120) AS actor,
    t.tenant_code AS object_code,
    ((('Cap nhat tenant '::text || (t.tenant_code)::text) || ' sang trang thai '::text) || (t.status)::text) AS title,
    t.updated_at AS event_time
   FROM platform.tenants t
UNION ALL
 SELECT 'ACCOUNT_LOGIN'::character varying(60) AS activity_type,
    (a.username)::character varying(120) AS actor,
    (COALESCE(primary_tenant.tenant_code, 'platform'::character varying))::character varying(120) AS object_code,
    (('Tai khoan '::text || (a.username)::text) || ' dang nhap'::text) AS title,
    a.last_login_at AS event_time
   FROM (platform.accounts a
     LEFT JOIN LATERAL ( SELECT t.tenant_code
           FROM (platform.account_tenants at
             JOIN platform.tenants t ON ((t.id = at.tenant_id)))
          WHERE (at.account_id = a.id)
          ORDER BY
                CASE
                    WHEN (lower((at.status)::text) = 'active'::text) THEN 0
                    ELSE 1
                END, t.tenant_code
         LIMIT 1) primary_tenant ON (true))
  WHERE (a.last_login_at IS NOT NULL);


ALTER VIEW platform.v_crm_recent_activities OWNER TO vanthao;

--
-- Name: v_crm_audit_events; Type: VIEW; Schema: platform; Owner: vanthao
--

CREATE VIEW platform.v_crm_audit_events AS
 SELECT event_time,
    actor AS admin_username,
    activity_type AS action_key,
    object_code,
    NULL::character varying(45) AS ip_address
   FROM platform.v_crm_recent_activities;


ALTER VIEW platform.v_crm_audit_events OWNER TO vanthao;

--
-- Name: v_crm_dashboard_snapshot; Type: VIEW; Schema: platform; Owner: vanthao
--

CREATE VIEW platform.v_crm_dashboard_snapshot AS
 WITH tenant_stats AS (
         SELECT (count(*) FILTER (WHERE (lower((tenants.status)::text) = 'active'::text)))::integer AS active_tenants,
            (count(*) FILTER (WHERE (lower((tenants.status)::text) = 'trial'::text)))::integer AS trial_tenants,
            (count(*) FILTER (WHERE (lower((tenants.status)::text) = 'suspended'::text)))::integer AS suspended_tenants,
            (count(*))::integer AS total_tenants,
            COALESCE(sum(
                CASE lower((tenants.subscription_plan)::text)
                    WHEN 'standard'::text THEN 250000
                    WHEN 'pro'::text THEN 500000
                    WHEN 'enterprise'::text THEN 1200000
                    ELSE 0
                END), (0)::bigint) AS estimated_revenue
           FROM platform.tenants
        ), store_stats AS (
         SELECT (count(*))::integer AS total_stores,
            (count(*) FILTER (WHERE tenant_branches.is_active))::integer AS active_stores
           FROM platform.tenant_branches
        ), account_stats AS (
         SELECT (count(*))::integer AS total_accounts,
            (count(*) FILTER (WHERE (lower((accounts.status)::text) = 'active'::text)))::integer AS active_accounts,
            (count(*) FILTER (WHERE accounts.is_platform_admin))::integer AS total_platform_admins
           FROM platform.accounts
        )
 SELECT tenant_stats.active_tenants,
    tenant_stats.trial_tenants,
    tenant_stats.suspended_tenants,
    tenant_stats.total_tenants,
    tenant_stats.estimated_revenue,
    store_stats.total_stores,
    store_stats.active_stores,
    account_stats.total_accounts,
    account_stats.active_accounts,
    account_stats.total_platform_admins
   FROM ((tenant_stats
     CROSS JOIN store_stats)
     CROSS JOIN account_stats);


ALTER VIEW platform.v_crm_dashboard_snapshot OWNER TO vanthao;

--
-- Name: v_crm_hourly_login_usage; Type: VIEW; Schema: platform; Owner: vanthao
--

CREATE VIEW platform.v_crm_hourly_login_usage AS
 WITH slots AS (
         SELECT generate_series(8, 20, 2) AS hour_bucket
        )
 SELECT (lpad((s.hour_bucket)::text, 2, '0'::text) || 'h'::text) AS label,
    (count(a.id))::integer AS value,
    s.hour_bucket
   FROM (slots s
     LEFT JOIN platform.accounts a ON (((a.last_login_at IS NOT NULL) AND (((a.last_login_at AT TIME ZONE 'Asia/Ho_Chi_Minh'::text))::date = ((now() AT TIME ZONE 'Asia/Ho_Chi_Minh'::text))::date) AND ((((EXTRACT(hour FROM (a.last_login_at AT TIME ZONE 'Asia/Ho_Chi_Minh'::text)))::integer / 2) * 2) = s.hour_bucket))))
  GROUP BY s.hour_bucket
  ORDER BY s.hour_bucket;


ALTER VIEW platform.v_crm_hourly_login_usage OWNER TO vanthao;

--
-- Name: v_crm_monthly_tenant_growth; Type: VIEW; Schema: platform; Owner: vanthao
--

CREATE VIEW platform.v_crm_monthly_tenant_growth AS
 WITH months AS (
         SELECT generate_series((date_trunc('month'::text, now()) - '5 mons'::interval), date_trunc('month'::text, now()), '1 mon'::interval) AS month_start
        )
 SELECT to_char(m.month_start, 'MM/YYYY'::text) AS label,
    (count(t.id))::integer AS value,
    m.month_start
   FROM (months m
     LEFT JOIN platform.tenants t ON (((t.created_at >= m.month_start) AND (t.created_at < (m.month_start + '1 mon'::interval)))))
  GROUP BY m.month_start
  ORDER BY m.month_start;


ALTER VIEW platform.v_crm_monthly_tenant_growth OWNER TO vanthao;

--
-- Name: v_crm_suspicious_sessions; Type: VIEW; Schema: platform; Owner: vanthao
--

CREATE VIEW platform.v_crm_suspicious_sessions AS
 SELECT username,
    lower((status)::text) AS status_code,
        CASE
            WHEN (lower((status)::text) = 'locked'::text) THEN 'Tai khoan bi khoa'::text
            WHEN (lower((status)::text) = 'disabled'::text) THEN 'Tai khoan da bi vo hieu'::text
            WHEN (last_login_at IS NULL) THEN 'Chua co lich su dang nhap'::text
            ELSE 'Can kiem tra them'::text
        END AS note,
    NULL::character varying(45) AS ip_address,
    last_login_at AS event_time
   FROM platform.accounts a
  WHERE ((lower((status)::text) = ANY (ARRAY['locked'::text, 'disabled'::text])) OR (last_login_at IS NULL));


ALTER VIEW platform.v_crm_suspicious_sessions OWNER TO vanthao;

--
-- Name: webhook_endpoints; Type: TABLE; Schema: platform; Owner: vanthao
--

CREATE TABLE platform.webhook_endpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    endpoint_code character varying(50) NOT NULL,
    endpoint_url character varying(1000) NOT NULL,
    secret_hash character varying(255),
    event_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    retry_limit integer DEFAULT 5 NOT NULL,
    last_success_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_webhook_status CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'disabled'::character varying])::text[])))
);


ALTER TABLE platform.webhook_endpoints OWNER TO vanthao;

--
-- Name: account_branch_access account_branch_access_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_branch_access
    ADD CONSTRAINT account_branch_access_pkey PRIMARY KEY (id);


--
-- Name: account_mfa_methods account_mfa_methods_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_mfa_methods
    ADD CONSTRAINT account_mfa_methods_pkey PRIMARY KEY (id);


--
-- Name: account_role_bindings account_role_bindings_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_role_bindings
    ADD CONSTRAINT account_role_bindings_pkey PRIMARY KEY (id);


--
-- Name: account_tenants account_tenants_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_tenants
    ADD CONSTRAINT account_tenants_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: api_clients api_clients_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.api_clients
    ADD CONSTRAINT api_clients_pkey PRIMARY KEY (id);


--
-- Name: audit_events audit_events_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.audit_events
    ADD CONSTRAINT audit_events_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);


--
-- Name: bank_master bank_master_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.bank_master
    ADD CONSTRAINT bank_master_pkey PRIMARY KEY (id);


--
-- Name: crm_role_permissions crm_role_permissions_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.crm_role_permissions
    ADD CONSTRAINT crm_role_permissions_pkey PRIMARY KEY (id);


--
-- Name: device_identities device_identities_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.device_identities
    ADD CONSTRAINT device_identities_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history flyway_schema_history_pk; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.flyway_schema_history
    ADD CONSTRAINT flyway_schema_history_pk PRIMARY KEY (installed_rank);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: tenant_branches tenant_branches_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.tenant_branches
    ADD CONSTRAINT tenant_branches_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_store_public_code_key; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.tenants
    ADD CONSTRAINT tenants_store_public_code_key UNIQUE (store_public_code);


--
-- Name: account_branch_access uq_account_branch_access; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_branch_access
    ADD CONSTRAINT uq_account_branch_access UNIQUE (account_tenant_id, tenant_branch_id);


--
-- Name: account_role_bindings uq_account_role_binding; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_role_bindings
    ADD CONSTRAINT uq_account_role_binding UNIQUE (account_id, role_id, scope_type, scope_id);


--
-- Name: account_tenants uq_account_tenants; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_tenants
    ADD CONSTRAINT uq_account_tenants UNIQUE (account_id, tenant_id);


--
-- Name: accounts uq_accounts_username; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.accounts
    ADD CONSTRAINT uq_accounts_username UNIQUE (username);


--
-- Name: api_clients uq_api_clients; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.api_clients
    ADD CONSTRAINT uq_api_clients UNIQUE (tenant_id, client_code);


--
-- Name: auth_sessions uq_auth_sessions_token; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.auth_sessions
    ADD CONSTRAINT uq_auth_sessions_token UNIQUE (session_token_hash);


--
-- Name: bank_master uq_bank_master_bin; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.bank_master
    ADD CONSTRAINT uq_bank_master_bin UNIQUE (bank_bin);


--
-- Name: bank_master uq_bank_master_code; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.bank_master
    ADD CONSTRAINT uq_bank_master_code UNIQUE (bank_code);


--
-- Name: device_identities uq_device_uid; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.device_identities
    ADD CONSTRAINT uq_device_uid UNIQUE (device_uid);


--
-- Name: permissions uq_permissions_key; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.permissions
    ADD CONSTRAINT uq_permissions_key UNIQUE (permission_key);


--
-- Name: crm_role_permissions uq_platform_crm_role_permissions; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.crm_role_permissions
    ADD CONSTRAINT uq_platform_crm_role_permissions UNIQUE (role_key, permission_key);


--
-- Name: role_permissions uq_role_permissions; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.role_permissions
    ADD CONSTRAINT uq_role_permissions UNIQUE (role_id, permission_id);


--
-- Name: roles uq_roles_key; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.roles
    ADD CONSTRAINT uq_roles_key UNIQUE (role_key);


--
-- Name: tenant_branches uq_tenant_branches; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.tenant_branches
    ADD CONSTRAINT uq_tenant_branches UNIQUE (tenant_id, branch_code);


--
-- Name: tenants uq_tenants_code; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.tenants
    ADD CONSTRAINT uq_tenants_code UNIQUE (tenant_code);


--
-- Name: tenants uq_tenants_schema_name; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.tenants
    ADD CONSTRAINT uq_tenants_schema_name UNIQUE (schema_name);


--
-- Name: webhook_endpoints uq_webhook_endpoints; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.webhook_endpoints
    ADD CONSTRAINT uq_webhook_endpoints UNIQUE (tenant_id, endpoint_code);


--
-- Name: webhook_endpoints webhook_endpoints_pkey; Type: CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_pkey PRIMARY KEY (id);


--
-- Name: flyway_schema_history_s_idx; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX flyway_schema_history_s_idx ON platform.flyway_schema_history USING btree (success);


--
-- Name: idx_account_role_bindings_lookup; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_account_role_bindings_lookup ON platform.account_role_bindings USING btree (account_id, scope_type, scope_id);


--
-- Name: idx_account_role_bindings_role; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_account_role_bindings_role ON platform.account_role_bindings USING btree (role_id);


--
-- Name: idx_account_tenants_account; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_account_tenants_account ON platform.account_tenants USING btree (account_id);


--
-- Name: idx_account_tenants_tenant; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_account_tenants_tenant ON platform.account_tenants USING btree (tenant_id);


--
-- Name: idx_accounts_phone; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_accounts_phone ON platform.accounts USING btree (phone) WHERE (phone IS NOT NULL);


--
-- Name: idx_accounts_status; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_accounts_status ON platform.accounts USING btree (status);


--
-- Name: idx_api_clients_tenant_status; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_api_clients_tenant_status ON platform.api_clients USING btree (tenant_id, status);


--
-- Name: idx_audit_events_account; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_audit_events_account ON platform.audit_events USING btree (account_id, created_at DESC) WHERE (account_id IS NOT NULL);


--
-- Name: idx_audit_events_tenant; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_audit_events_tenant ON platform.audit_events USING btree (tenant_id, event_type, created_at DESC) WHERE (tenant_id IS NOT NULL);


--
-- Name: idx_audit_events_tenant_created; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_audit_events_tenant_created ON platform.audit_events USING btree (tenant_id, created_at DESC);


--
-- Name: idx_audit_events_type_created; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_audit_events_type_created ON platform.audit_events USING btree (event_type, created_at DESC);


--
-- Name: idx_auth_sessions_account; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_auth_sessions_account ON platform.auth_sessions USING btree (account_id, session_status);


--
-- Name: idx_auth_sessions_account_status; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_auth_sessions_account_status ON platform.auth_sessions USING btree (account_id, session_status);


--
-- Name: idx_auth_sessions_device; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_auth_sessions_device ON platform.auth_sessions USING btree (device_identity_id, session_status);


--
-- Name: idx_auth_sessions_expires; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_auth_sessions_expires ON platform.auth_sessions USING btree (expires_at) WHERE ((session_status)::text = 'active'::text);


--
-- Name: idx_auth_sessions_tenant_status; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_auth_sessions_tenant_status ON platform.auth_sessions USING btree (tenant_id, session_status);


--
-- Name: idx_device_identities_account; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_device_identities_account ON platform.device_identities USING btree (account_id);


--
-- Name: idx_platform_crm_role_permissions_permission_key; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_platform_crm_role_permissions_permission_key ON platform.crm_role_permissions USING btree (permission_key);


--
-- Name: idx_platform_crm_role_permissions_role_key; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_platform_crm_role_permissions_role_key ON platform.crm_role_permissions USING btree (role_key);


--
-- Name: idx_platform_role_permissions_permission_id; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_platform_role_permissions_permission_id ON platform.role_permissions USING btree (permission_id);


--
-- Name: idx_platform_role_permissions_role_id; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_platform_role_permissions_role_id ON platform.role_permissions USING btree (role_id);


--
-- Name: idx_platform_roles_scope_sort; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_platform_roles_scope_sort ON platform.roles USING btree (role_scope, sort_order, role_key);


--
-- Name: idx_role_bindings_account_scope; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_role_bindings_account_scope ON platform.account_role_bindings USING btree (account_id, scope_type, scope_id);


--
-- Name: idx_role_bindings_role; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_role_bindings_role ON platform.account_role_bindings USING btree (role_id);


--
-- Name: idx_tenant_branches_tenant; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_tenant_branches_tenant ON platform.tenant_branches USING btree (tenant_id, is_active);


--
-- Name: idx_tenants_status; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_tenants_status ON platform.tenants USING btree (status, subscription_plan);


--
-- Name: idx_webhook_endpoints_tenant_status; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE INDEX idx_webhook_endpoints_tenant_status ON platform.webhook_endpoints USING btree (tenant_id, status);


--
-- Name: uq_account_branch_default; Type: INDEX; Schema: platform; Owner: vanthao
--

CREATE UNIQUE INDEX uq_account_branch_default ON platform.account_branch_access USING btree (account_tenant_id) WHERE (is_default = true);


--
-- Name: account_branch_access trg_account_branch_access_updated_at; Type: TRIGGER; Schema: platform; Owner: vanthao
--

CREATE TRIGGER trg_account_branch_access_updated_at BEFORE UPDATE ON platform.account_branch_access FOR EACH ROW EXECUTE FUNCTION platform.fn_touch_updated_at();


--
-- Name: account_mfa_methods trg_account_mfa_updated_at; Type: TRIGGER; Schema: platform; Owner: vanthao
--

CREATE TRIGGER trg_account_mfa_updated_at BEFORE UPDATE ON platform.account_mfa_methods FOR EACH ROW EXECUTE FUNCTION platform.fn_touch_updated_at();


--
-- Name: account_tenants trg_account_tenants_updated_at; Type: TRIGGER; Schema: platform; Owner: vanthao
--

CREATE TRIGGER trg_account_tenants_updated_at BEFORE UPDATE ON platform.account_tenants FOR EACH ROW EXECUTE FUNCTION platform.fn_touch_updated_at();


--
-- Name: accounts trg_accounts_updated_at; Type: TRIGGER; Schema: platform; Owner: vanthao
--

CREATE TRIGGER trg_accounts_updated_at BEFORE UPDATE ON platform.accounts FOR EACH ROW EXECUTE FUNCTION platform.fn_touch_updated_at();


--
-- Name: api_clients trg_api_clients_updated_at; Type: TRIGGER; Schema: platform; Owner: vanthao
--

CREATE TRIGGER trg_api_clients_updated_at BEFORE UPDATE ON platform.api_clients FOR EACH ROW EXECUTE FUNCTION platform.fn_touch_updated_at();


--
-- Name: bank_master trg_bank_master_updated_at; Type: TRIGGER; Schema: platform; Owner: vanthao
--

CREATE TRIGGER trg_bank_master_updated_at BEFORE UPDATE ON platform.bank_master FOR EACH ROW EXECUTE FUNCTION platform.fn_touch_updated_at();


--
-- Name: device_identities trg_device_identities_updated_at; Type: TRIGGER; Schema: platform; Owner: vanthao
--

CREATE TRIGGER trg_device_identities_updated_at BEFORE UPDATE ON platform.device_identities FOR EACH ROW EXECUTE FUNCTION platform.fn_touch_updated_at();


--
-- Name: permissions trg_permissions_updated_at; Type: TRIGGER; Schema: platform; Owner: vanthao
--

CREATE TRIGGER trg_permissions_updated_at BEFORE UPDATE ON platform.permissions FOR EACH ROW EXECUTE FUNCTION platform.fn_touch_updated_at();


--
-- Name: roles trg_roles_updated_at; Type: TRIGGER; Schema: platform; Owner: vanthao
--

CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON platform.roles FOR EACH ROW EXECUTE FUNCTION platform.fn_touch_updated_at();


--
-- Name: tenant_branches trg_tenant_branches_updated_at; Type: TRIGGER; Schema: platform; Owner: vanthao
--

CREATE TRIGGER trg_tenant_branches_updated_at BEFORE UPDATE ON platform.tenant_branches FOR EACH ROW EXECUTE FUNCTION platform.fn_touch_updated_at();


--
-- Name: tenants trg_tenants_assign_codes; Type: TRIGGER; Schema: platform; Owner: vanthao
--

CREATE TRIGGER trg_tenants_assign_codes BEFORE INSERT ON platform.tenants FOR EACH ROW EXECUTE FUNCTION platform.fn_assign_tenant_code_and_schema_name();


--
-- Name: tenants trg_tenants_updated_at; Type: TRIGGER; Schema: platform; Owner: vanthao
--

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON platform.tenants FOR EACH ROW EXECUTE FUNCTION platform.fn_touch_updated_at();


--
-- Name: webhook_endpoints trg_webhook_endpoints_updated_at; Type: TRIGGER; Schema: platform; Owner: vanthao
--

CREATE TRIGGER trg_webhook_endpoints_updated_at BEFORE UPDATE ON platform.webhook_endpoints FOR EACH ROW EXECUTE FUNCTION platform.fn_touch_updated_at();


--
-- Name: account_branch_access account_branch_access_account_tenant_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_branch_access
    ADD CONSTRAINT account_branch_access_account_tenant_id_fkey FOREIGN KEY (account_tenant_id) REFERENCES platform.account_tenants(id) ON DELETE CASCADE;


--
-- Name: account_branch_access account_branch_access_tenant_branch_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_branch_access
    ADD CONSTRAINT account_branch_access_tenant_branch_id_fkey FOREIGN KEY (tenant_branch_id) REFERENCES platform.tenant_branches(id) ON DELETE CASCADE;


--
-- Name: account_mfa_methods account_mfa_methods_account_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_mfa_methods
    ADD CONSTRAINT account_mfa_methods_account_id_fkey FOREIGN KEY (account_id) REFERENCES platform.accounts(id) ON DELETE CASCADE;


--
-- Name: account_role_bindings account_role_bindings_account_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_role_bindings
    ADD CONSTRAINT account_role_bindings_account_id_fkey FOREIGN KEY (account_id) REFERENCES platform.accounts(id) ON DELETE CASCADE;


--
-- Name: account_role_bindings account_role_bindings_granted_by_account_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_role_bindings
    ADD CONSTRAINT account_role_bindings_granted_by_account_id_fkey FOREIGN KEY (granted_by_account_id) REFERENCES platform.accounts(id);


--
-- Name: account_role_bindings account_role_bindings_role_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_role_bindings
    ADD CONSTRAINT account_role_bindings_role_id_fkey FOREIGN KEY (role_id) REFERENCES platform.roles(id) ON DELETE CASCADE;


--
-- Name: account_tenants account_tenants_account_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_tenants
    ADD CONSTRAINT account_tenants_account_id_fkey FOREIGN KEY (account_id) REFERENCES platform.accounts(id) ON DELETE CASCADE;


--
-- Name: account_tenants account_tenants_tenant_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.account_tenants
    ADD CONSTRAINT account_tenants_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES platform.tenants(id) ON DELETE CASCADE;


--
-- Name: api_clients api_clients_tenant_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.api_clients
    ADD CONSTRAINT api_clients_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES platform.tenants(id) ON DELETE CASCADE;


--
-- Name: audit_events audit_events_account_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.audit_events
    ADD CONSTRAINT audit_events_account_id_fkey FOREIGN KEY (account_id) REFERENCES platform.accounts(id) ON DELETE SET NULL;


--
-- Name: audit_events audit_events_tenant_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.audit_events
    ADD CONSTRAINT audit_events_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES platform.tenants(id) ON DELETE SET NULL;


--
-- Name: auth_sessions auth_sessions_account_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.auth_sessions
    ADD CONSTRAINT auth_sessions_account_id_fkey FOREIGN KEY (account_id) REFERENCES platform.accounts(id) ON DELETE CASCADE;


--
-- Name: auth_sessions auth_sessions_device_identity_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.auth_sessions
    ADD CONSTRAINT auth_sessions_device_identity_id_fkey FOREIGN KEY (device_identity_id) REFERENCES platform.device_identities(id) ON DELETE SET NULL;


--
-- Name: auth_sessions auth_sessions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.auth_sessions
    ADD CONSTRAINT auth_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES platform.tenants(id) ON DELETE SET NULL;


--
-- Name: device_identities device_identities_account_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.device_identities
    ADD CONSTRAINT device_identities_account_id_fkey FOREIGN KEY (account_id) REFERENCES platform.accounts(id) ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_permission_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES platform.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.role_permissions
    ADD CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES platform.roles(id) ON DELETE CASCADE;


--
-- Name: tenant_branches tenant_branches_tenant_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.tenant_branches
    ADD CONSTRAINT tenant_branches_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES platform.tenants(id) ON DELETE CASCADE;


--
-- Name: webhook_endpoints webhook_endpoints_tenant_id_fkey; Type: FK CONSTRAINT; Schema: platform; Owner: vanthao
--

ALTER TABLE ONLY platform.webhook_endpoints
    ADD CONSTRAINT webhook_endpoints_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES platform.tenants(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict I1SanTRVh5niPlOdSZosqxIOqbOXjyYHgT5uUdYWALidpCP2ofMwyj0pgELExZV

