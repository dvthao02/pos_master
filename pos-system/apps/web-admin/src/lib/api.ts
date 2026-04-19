export type LoginZone = "platform" | "tenant";

export type AuthSession = {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  loginZone: LoginZone;
  tenantCode: string;
  username: string;
  fullName: string;
  accessLevel: string | null;
  roles: string[];
};

export type CrmBootstrapResponse = {
  tenants: Array<{ tenantCode: string; legalName: string; status: string }>;
  roles: Array<{ roleKey: string; roleName: string }>;
  permissions: Array<{ permissionKey: string; permissionName: string; moduleKey: string }>;
};

export type EmployeeSummaryResponse = {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: string;
  platformAdmin: boolean;
  platformRoles: string[];
  tenantAccesses: Array<{
    tenantCode: string;
    accessLevel: string;
    status: string;
    defaultBranchCode: string | null;
    roles: string[];
  }>;
};

export type StoreSummaryResponse = {
  id: string;
  tenantCode: string;
  branchCode: string;
  branchName: string;
  sourceSchemaName: string;
  active: boolean;
  subscriptionPlan: string | null;
  subscriptionExpiresAt: string | null;
  tenantStatus: string | null;
  responsibleUsername: string | null;
  responsibleFullName: string | null;
};

export type TenantSchemaSummaryResponse = {
  tenantId: string;
  tenantCode: string;
  schemaName: string;
  legalName: string;
  brandName: string | null;
  subscriptionPlan: string;
  status: string;
  createdAt: string | null;
  subscriptionExpiresAt: string | null;
  responsibleAccountId: string | null;
  responsibleUsername: string | null;
  responsibleFullName: string | null;
  storeCount: number;
};

export type EnterpriseSummaryResponse = {
  tenantId: string;
  tenantCode: string;
  schemaName: string;
  legalName: string;
  primaryDomain: string | null;
  subscriptionPlan: string;
  createdAt: string | null;
  subscriptionExpiresAt: string | null;
  status: string;
  responsibleAccountId: string | null;
  responsibleUsername: string | null;
  responsibleFullName: string | null;
  storeCount: number;
};

export type RenewalKeyResponse = {
  keyCode: string;
  tenantCode: string;
  extendMonths: number;
  status: string;
  expiresAt: string;
  usedAt: string | null;
};

export type CrmAnalyticsResponse = {
  dashboard: {
    activeTenants: number;
    trialTenants: number;
    suspendedTenants: number;
    totalTenants: number;
    totalStores: number;
    totalAccounts: number;
    totalPlatformAdmins: number;
    estimatedRevenue: number;
  };
  tenantGrowthSeries: Array<{ label: string; value: number }>;
  loginUsageSeries: Array<{ label: string; value: number }>;
  notifications: Array<{ title: string; target: string; time: string }>;
  supportTickets: Array<{ tenant: string; title: string; level: string; status: string }>;
  recentActivities: Array<{ title: string; time: string }>;
  auditEvents: Array<{ time: string; admin: string; action: string; object: string; ip: string }>;
  suspiciousSessions: Array<{ user: string; ip: string; note: string; status: string }>;
};

export type RolePermissionSummaryResponse = {
  roleKey: string;
  roleName: string;
  roleScope: "platform" | "tenant";
  permissionKeys: string[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function requestJson<TResponse>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    token?: string;
    payload?: unknown;
  } = {}
): Promise<TResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
      },
      body: options.payload !== undefined ? JSON.stringify(options.payload) : undefined
    });
  } catch {
    throw new Error("Không kết nối được máy chủ API. Hãy kiểm tra dịch vụ backend đang chạy.");
  }

  if (!response.ok) {
    let detail = "";
    const contentType = response.headers.get("content-type") ?? "";

    try {
      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as { message?: string; error?: string; detail?: string };
        detail = payload.message ?? payload.error ?? payload.detail ?? "";
      } else {
        detail = (await response.text()).trim();
      }
    } catch {
      detail = "";
    }

    if (detail) {
      throw new Error(`Yêu cầu thất bại (${response.status}): ${detail}`);
    }
    throw new Error(`Yêu cầu thất bại (${response.status})`);
  }

  return (await response.json()) as TResponse;
}

export async function loginPlatform(username: string, password: string): Promise<AuthSession> {
  return requestJson<AuthSession>("/api/auth/platform/login", {
    method: "POST",
    payload: { username, password }
  });
}

export async function loginTenant(
  username: string,
  password: string,
  tenantCode: string
): Promise<AuthSession> {
  return requestJson<AuthSession>("/api/auth/tenant/login", {
    method: "POST",
    payload: { username, password, tenantCode }
  });
}

export async function getPlatformTenants(token: string): Promise<Array<Record<string, unknown>>> {
  return requestJson<Array<Record<string, unknown>>>("/api/platform/tenants", { token });
}

export async function getCrmBootstrap(token: string): Promise<CrmBootstrapResponse> {
  return requestJson<CrmBootstrapResponse>("/api/crm/bootstrap", { token });
}

export async function getCrmAnalytics(token: string): Promise<CrmAnalyticsResponse> {
  return requestJson<CrmAnalyticsResponse>("/api/crm/analytics", { token });
}

export async function getCrmEmployees(token: string): Promise<EmployeeSummaryResponse[]> {
  return requestJson<EmployeeSummaryResponse[]>("/api/crm/employees", { token });
}

export async function createCrmEmployee(
  token: string,
  payload: {
    username: string;
    password: string;
    fullName: string;
    email?: string;
    phone?: string;
    status: string;
    platformAdmin: boolean;
    platformRoleKeys: string[];
  }
): Promise<EmployeeSummaryResponse> {
  return requestJson<EmployeeSummaryResponse>("/api/crm/employees", {
    method: "POST",
    token,
    payload
  });
}

export async function updateCrmEmployee(
  token: string,
  accountId: string,
  payload: {
    fullName: string;
    email?: string;
    phone?: string;
    status: string;
    platformAdmin: boolean;
  }
): Promise<EmployeeSummaryResponse> {
  return requestJson<EmployeeSummaryResponse>(`/api/crm/employees/${accountId}`, {
    method: "PUT",
    token,
    payload
  });
}

export async function updateCrmEmployeePassword(
  token: string,
  accountId: string,
  newPassword: string
): Promise<EmployeeSummaryResponse> {
  return requestJson<EmployeeSummaryResponse>(`/api/crm/employees/${accountId}/password`, {
    method: "PUT",
    token,
    payload: { newPassword }
  });
}

export async function disableCrmEmployee(token: string, accountId: string): Promise<EmployeeSummaryResponse> {
  return requestJson<EmployeeSummaryResponse>(`/api/crm/employees/${accountId}`, {
    method: "DELETE",
    token
  });
}

export async function updateCrmPlatformRoles(
  token: string,
  accountId: string,
  roleKeys: string[]
): Promise<EmployeeSummaryResponse> {
  return requestJson<EmployeeSummaryResponse>(`/api/crm/employees/${accountId}/platform-roles`, {
    method: "PUT",
    token,
    payload: { roleKeys }
  });
}

export async function upsertCrmTenantAccess(
  token: string,
  accountId: string,
  tenantCode: string,
  payload: {
    accessLevel: string;
    status: string;
    defaultBranchCode?: string;
    roleKeys: string[];
  }
): Promise<EmployeeSummaryResponse> {
  return requestJson<EmployeeSummaryResponse>(`/api/crm/employees/${accountId}/tenant-access/${tenantCode}`, {
    method: "PUT",
    token,
    payload
  });
}

export async function removeCrmTenantAccess(
  token: string,
  accountId: string,
  tenantCode: string
): Promise<EmployeeSummaryResponse> {
  return requestJson<EmployeeSummaryResponse>(`/api/crm/employees/${accountId}/tenant-access/${encodeURIComponent(tenantCode)}`, {
    method: "DELETE",
    token
  });
}

export async function getCrmRoles(token: string): Promise<RolePermissionSummaryResponse[]> {
  return requestJson<RolePermissionSummaryResponse[]>("/api/crm/roles", { token });
}

export async function createCrmRole(
  token: string,
  payload: {
    roleKey: string;
    roleName: string;
    roleScope: "platform" | "tenant";
    permissionKeys: string[];
  }
): Promise<RolePermissionSummaryResponse> {
  return requestJson<RolePermissionSummaryResponse>("/api/crm/roles", {
    method: "POST",
    token,
    payload
  });
}

export async function updateCrmRolePermissions(
  token: string,
  roleKey: string,
  permissionKeys: string[]
): Promise<RolePermissionSummaryResponse> {
  return requestJson<RolePermissionSummaryResponse>(`/api/crm/roles/${encodeURIComponent(roleKey)}/permissions`, {
    method: "PUT",
    token,
    payload: { permissionKeys }
  });
}

export async function deleteCrmRole(token: string, roleKey: string): Promise<RolePermissionSummaryResponse> {
  return requestJson<RolePermissionSummaryResponse>(`/api/crm/roles/${encodeURIComponent(roleKey)}`, {
    method: "DELETE",
    token
  });
}

export async function getCrmStores(token: string, tenantCode: string): Promise<StoreSummaryResponse[]> {
  return requestJson<StoreSummaryResponse[]>(
    `/api/crm/stores?tenantCode=${encodeURIComponent(tenantCode)}`,
    { token }
  );
}

export async function createCrmStore(
  token: string,
  payload: {
    tenantCode: string;
    branchCode: string;
    branchName: string;
    sourceSchemaName: string;
  }
): Promise<StoreSummaryResponse> {
  return requestJson<StoreSummaryResponse>("/api/crm/stores", {
    method: "POST",
    token,
    payload
  });
}

export async function updateCrmStore(
  token: string,
  storeId: string,
  payload: {
    branchName?: string;
    sourceSchemaName?: string;
    active?: boolean;
  }
): Promise<StoreSummaryResponse> {
  return requestJson<StoreSummaryResponse>(`/api/crm/stores/${storeId}`, {
    method: "PUT",
    token,
    payload
  });
}

export async function disableCrmStore(token: string, storeId: string): Promise<StoreSummaryResponse> {
  return requestJson<StoreSummaryResponse>(`/api/crm/stores/${storeId}`, {
    method: "DELETE",
    token
  });
}

export async function getCrmTenantSchemas(token: string): Promise<TenantSchemaSummaryResponse[]> {
  return requestJson<TenantSchemaSummaryResponse[]>("/api/crm/tenant-schemas", { token });
}

export async function getCrmEnterprises(
  token: string,
  filters?: {
    search?: string;
    subscriptionPlan?: string;
    status?: string;
    expiringInDays?: number;
  }
): Promise<EnterpriseSummaryResponse[]> {
  const params = new URLSearchParams();
  if (filters?.search) {
    params.set("search", filters.search);
  }
  if (filters?.subscriptionPlan) {
    params.set("subscriptionPlan", filters.subscriptionPlan);
  }
  if (filters?.status) {
    params.set("status", filters.status);
  }
  if (typeof filters?.expiringInDays === "number") {
    params.set("expiringInDays", String(filters.expiringInDays));
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return requestJson<EnterpriseSummaryResponse[]>(`/api/crm/enterprises${suffix}`, { token });
}

export async function createCrmTenantSchema(
  token: string,
  payload: {
    tenantCode?: string;
    schemaName?: string;
    legalName: string;
    brandName?: string;
    subscriptionPlan?: string;
    status?: string;
    responsibleAccountId?: string;
  }
): Promise<TenantSchemaSummaryResponse> {
  return requestJson<TenantSchemaSummaryResponse>("/api/crm/tenant-schemas", {
    method: "POST",
    token,
    payload
  });
}

export async function updateCrmTenantSchema(
  token: string,
  tenantCode: string,
  payload: {
    legalName?: string;
    brandName?: string;
    subscriptionPlan?: string;
    status?: string;
    responsibleAccountId?: string;
    createdAt?: string;
    subscriptionExpiresAt?: string;
  }
): Promise<TenantSchemaSummaryResponse> {
  return requestJson<TenantSchemaSummaryResponse>(`/api/crm/tenant-schemas/${encodeURIComponent(tenantCode)}`, {
    method: "PUT",
    token,
    payload
  });
}

export async function updateCrmTenantSubscriptionPlan(
  token: string,
  tenantCode: string,
  payload: {
    subscriptionPlan: string;
    note?: string;
    createdAt?: string;
    subscriptionExpiresAt?: string;
  }
): Promise<TenantSchemaSummaryResponse> {
  return requestJson<TenantSchemaSummaryResponse>(
    `/api/crm/tenant-schemas/${encodeURIComponent(tenantCode)}/subscription-plan`,
    {
      method: "PUT",
      token,
      payload
    }
  );
}

export async function createCrmRenewalKey(
  token: string,
  tenantCode: string,
  payload: {
    extendMonths: number;
    validDays?: number;
    note?: string;
  }
): Promise<RenewalKeyResponse> {
  return requestJson<RenewalKeyResponse>(
    `/api/crm/tenant-schemas/${encodeURIComponent(tenantCode)}/renewal-keys`,
    {
      method: "POST",
      token,
      payload
    }
  );
}

export async function renewCrmTenantSubscription(
  token: string,
  tenantCode: string,
  payload: {
    extendMonths?: number;
    renewalKey?: string;
    note?: string;
  }
): Promise<TenantSchemaSummaryResponse> {
  return requestJson<TenantSchemaSummaryResponse>(`/api/crm/tenant-schemas/${encodeURIComponent(tenantCode)}/renew`, {
    method: "PUT",
    token,
    payload
  });
}
