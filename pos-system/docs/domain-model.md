# POS Domain Model (metadata-derived)

This document is derived from backup metadata in:

- `C:\Users\PC\Desktop\backup\fullbackup.sql`

Extraction time: `2026-04-18`
Dump type: PostgreSQL custom dump (`PGDMP`)

## 1) Multi-tenant model

- Platform-level design (expected by architecture):
- `schema: platform` for system-wide identities and tenancy registry (`accounts`, `tenants`, `roles`, etc.).
- `schema: {tenant_code}` for tenant business data.
- Runtime schema resolution:
- JWT claim `tenantCode` -> `TenantContextHolder` -> set active schema for request lifecycle.

Note: this backup includes `tenant_template` only. `platform` schema objects are not present in this dump.

## 2) Entity modules (tenant schema)

Source schema: `tenant_template`
Object counts from metadata:

- Tables: `51`
- Functions: `22`
- Views: `16`
- Triggers: `47`

### Module map

| Module | Main purpose | Entities |
|---|---|---|
| Organization & workforce | Stores, staff, shifts, register lifecycle | `stores`, `staff_members`, `business_periods`, `work_shifts`, `registers` |
| Customer & CRM | Customer profile, grouping, addresses, debt and notifications | `customers`, `customer_groups`, `customer_addresses`, `customer_ledgers`, `app_notifications` |
| Catalog & pricing | Product hierarchy, variants, unit, media, combo, discounts | `product_categories`, `service_categories`, `products`, `product_variants`, `product_units`, `product_images`, `combo_items`, `discounts`, `product_price_overrides`, `media_assets` |
| Sales POS | Order, order lines, payments, returns | `sales_orders`, `sales_order_lines`, `order_payments`, `payment_methods`, `order_returns`, `order_return_lines` |
| Table service | Table floor and table session state | `floor_plans`, `dining_tables`, `table_sessions` |
| Kitchen | Kitchen ticket generation and line-level prep | `kitchen_tickets`, `kitchen_ticket_lines` |
| Inventory | Stock locations, balances, adjustments, transfers, movements | `stock_locations`, `stock_balances`, `stock_transactions`, `stock_adjustments`, `stock_adjustment_lines`, `stock_transfers`, `stock_transfer_lines` |
| Purchasing | Supplier procurement flow | `suppliers`, `purchase_orders`, `purchase_order_lines` |
| Finance & accounting | Cash movement and journals | `cash_accounts`, `cash_transactions`, `chart_of_accounts`, `journal_entries`, `journal_lines` |
| Devices & peripherals | Device / printer binding for POS operation | `device_bindings`, `printer_devices` |
| Booking & service | Appointment flow | `appointments`, `appointment_lines` |
| System configuration | Running sequence and code generation support | `document_sequences` |

## 3) Core relationships (from foreign keys)

High-impact relationship clusters:

- `sales_orders` -> `stores`, `customers`, `staff_members` (cashier), `registers`, `work_shifts`
- `sales_order_lines` -> `sales_orders`, `products`, `product_variants`
- `order_payments` -> `sales_orders`, `payment_methods`
- `order_returns` -> `sales_orders`, `stores`, `staff_members`
- `order_return_lines` -> `order_returns`, `sales_order_lines`, `products`, `product_variants`
- `kitchen_tickets` -> `sales_orders`, `stores`
- `kitchen_ticket_lines` -> `kitchen_tickets`, `sales_order_lines`
- `dining_tables` -> `floor_plans`, `stores`
- `table_sessions` -> `dining_tables`, `sales_orders`, `stores`, `staff_members`
- `purchase_orders` -> `suppliers`, `stores`, `staff_members` (`created_by`, `approved_by`)
- `purchase_order_lines` -> `purchase_orders`, `products`, `product_variants`
- `stock_balances` -> `stores`, `stock_locations`, `products`, `product_variants`
- `stock_transactions` -> `stores`, `stock_locations`, `products`, `product_variants`, `staff_members`
- `stock_adjustments` -> `stores`, `staff_members`
- `stock_adjustment_lines` -> `stock_adjustments`, `products`, `product_variants`
- `stock_transfers` -> `from_store`, `to_store`, `from_location`, `to_location`, `staff_members`
- `stock_transfer_lines` -> `stock_transfers`, `products`, `product_variants`
- `customers` -> `customer_groups`, `stores`
- `customer_addresses` -> `customers`
- `customer_ledgers` -> `customers`, `sales_orders`, `staff_members`
- `cash_transactions` -> `cash_accounts`, `stores`, `staff_members`
- `journal_lines` -> `journal_entries`, `chart_of_accounts`
- `chart_of_accounts` supports parent-child hierarchy via self reference (`parent_id`)
- `stores` supports hierarchy via self reference (`parent_id`)

## 4) Domain automation (functions + triggers)

Observed automation patterns:

- Auto code generators:
- `fn_auto_category_code`
- `fn_auto_customer_code`
- `fn_auto_location_code`
- `fn_auto_order_code`
- `fn_auto_po_code`
- `fn_auto_product_code`
- `fn_auto_register_code`
- `fn_auto_shift_code`
- `fn_auto_staff_code`
- `fn_auto_store_code`
- `fn_auto_supplier_code`
- `fn_next_code` (base sequence logic)
- Sales lifecycle synchronization:
- `fn_recalc_order_totals`
- `fn_sync_order_payment`
- `fn_sync_customer_stats`
- `fn_sync_table_status`
- Kitchen and stock workflow:
- `fn_auto_kitchen_ticket` (create kitchen ticket when order transitions to confirmed)
- `fn_deduct_stock_on_sale`
- `fn_restore_stock_on_cancel`
- Stock and supplier accounting sync:
- `fn_sync_stock_balance`
- `fn_sync_supplier_debt`
- Generic row maintenance:
- `fn_touch_updated_at`

This indicates a DB-centric domain policy style, where core invariants are enforced by trigger-backed logic.

## 5) Reporting read models (views)

Views currently present:

- `v_cash_flow_daily`
- `v_customer_ranking`
- `v_daily_sales`
- `v_inventory_movement`
- `v_low_stock`
- `v_open_orders`
- `v_outstanding_po`
- `v_payment_method_summary`
- `v_product_sales_summary`
- `v_product_stock`
- `v_profit_by_product`
- `v_register_summary`
- `v_revenue_by_hour`
- `v_shift_summary`
- `v_staff_performance`
- `v_table_status`

## 6) Gap list before final DDD mapping

- Platform schema entities are missing from this backup (`accounts`, `tenants`, `roles`, `permissions`, tenant-user mapping).
- No reliable row counts can be inferred from this dump parsing method.
- For exact column-level contracts, export plain SQL using `pg_restore -f` and regenerate this document with full DDL parsing.

