export type AdminSection = "dashboard" | "stores" | "customers" | "platform" | "notifications" | "reports" | "audit" | "settings";
export type StoreTab = "tenants" | "billing";
export type PlatformTab = "accounts" | "roles";
export type NotificationTab = "system" | "tickets" | "broadcast";
export type ReportTab = "tenant" | "revenue" | "growth" | "usage";
export type AuditTab = "events" | "suspicious";
export type SettingsTab = "platform" | "smtp" | "integrations" | "security";
export type NavGroupKey = "operations" | "platform" | "governance";

export type RowMenuState = {
  tenantCode: string;
  top: number;
  left: number;
};

export type TenantStatusTarget = "active" | "suspended" | "closed";
export type TenantInlineActionMode = "list" | "edit" | "plan" | "status" | "impersonate" | "invoice";

export function parseRoleInput(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item.length > 0);
}

export function parsePermissionInput(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

export function getVietnameseStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "Hoat dong";
    case "trial":
      return "Thu nghiem";
    case "suspended":
      return "Tam ngung";
    case "closed":
      return "Da dong";
    case "locked":
      return "Bi khoa";
    case "disabled":
      return "Vo hieu";
    case "pending":
      return "Cho kich hoat";
    default:
      return status;
  }
}

export function getAccessLevelLabel(level: string): string {
  switch (level) {
    case "owner":
      return "Chu doanh nghiep";
    case "admin":
      return "Quan tri doanh nghiep";
    case "manager":
      return "Quan ly";
    case "cashier":
      return "Thu ngan";
    case "inventory":
      return "Kho";
    case "auditor":
      return "Kiem soat";
    case "staff":
      return "Nhan vien";
    case "api":
      return "API";
    default:
      return level;
  }
}

export function getRoleScopeLabel(scope: "platform" | "tenant"): string {
  return scope === "platform" ? "He thong" : "Doanh nghiep";
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString("vi-VN");
}

export function formatExpiryDate(value: string | null): string {
  if (!value) {
    return "Chua dat";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Chua dat";
  }
  return date.toLocaleDateString("vi-VN");
}

export function formatCurrentMonthRange(value = new Date()): string {
  const start = new Date(value.getFullYear(), value.getMonth(), 1);
  const end = new Date(value.getFullYear(), value.getMonth() + 1, 0);
  return `${start.toLocaleDateString("vi-VN")} - ${end.toLocaleDateString("vi-VN")}`;
}

export function normalizeStoreCode(value: string): string {
  return value.trim().toLowerCase().replace(/^tenant[_-]?/i, "");
}

export function getChainAccessCode(schemaName: string, fallbackCode = ""): string {
  const source = schemaName.trim() || fallbackCode.trim();
  return source ? source.replace(/^tenant[_-]?/i, "") : "";
}

export function buildTenantSchemaName(tenantCode: string): string {
  const normalized = normalizeStoreCode(tenantCode);
  return normalized ? `tenant_${normalized}` : "";
}

export const planPriceMap: Record<string, number> = {
  standard: 250000,
  pro: 500000,
  enterprise: 1200000
};

export const billingPlans = [
  { name: "Standard", price: 250000, branches: 3, accounts: 10, features: ["POS co ban", "Bao cao co ban"] },
  { name: "Pro", price: 500000, branches: 10, accounts: 30, features: ["Khuyen mai", "CRM nang cao", "API mo rong"] },
  { name: "Enterprise", price: 1200000, branches: 50, accounts: 200, features: ["SSO", "Audit nang cao", "MFA bat buoc"] }
];
