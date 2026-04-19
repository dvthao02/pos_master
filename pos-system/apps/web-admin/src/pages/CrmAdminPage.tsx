import { FormEvent, MouseEvent as ReactMouseEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCrmRenewalKey,
  createCrmEmployee,
  createCrmRole,
  createCrmStore,
  createCrmTenantSchema,
  deleteCrmRole,
  disableCrmEmployee,
  getCrmAnalytics,
  getCrmBootstrap,
  getCrmEmployees,
  getCrmEnterprises,
  getCrmRoles,
  getCrmStores,
  getCrmTenantSchemas,
  removeCrmTenantAccess,
  renewCrmTenantSubscription,
  updateCrmEmployee,
  updateCrmEmployeePassword,
  updateCrmPlatformRoles,
  updateCrmRolePermissions,
  updateCrmTenantSubscriptionPlan,
  updateCrmTenantSchema,
  upsertCrmTenantAccess
} from "../lib/api";
import type { StoreSummaryResponse } from "../lib/api";
import {
  ActionListCard,
  DonutBreakdownCard,
  FeedCard,
  LineChartCard,
  MetricTile,
  RankingTableCard,
  SectionCard,
  WorkspaceHeader
} from "../components/WorkspaceUi";
import { TopBar } from "../components/TopBar";
import { useAuthStore } from "../store/authStore";
import {
  billingPlans,
  buildTenantSchemaName,
  formatCurrentMonthRange,
  formatExpiryDate,
  formatMoney,
  getAccessLevelLabel,
  getChainAccessCode,
  getRoleScopeLabel,
  getVietnameseStatusLabel,
  normalizeStoreCode,
  parsePermissionInput,
  parseRoleInput,
  planPriceMap,
  type AdminSection,
  type AuditTab,
  type NavGroupKey,
  type NotificationTab,
  type PlatformTab,
  type ReportTab,
  type RowMenuState,
  type SettingsTab,
  type StoreTab,
  type TenantInlineActionMode,
  type TenantStatusTarget
} from "./crmAdmin.shared";

export function CrmAdminPage() {
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const params = useParams<{ tenantCode?: string }>();
  const token = session?.accessToken ?? "";

  const [activeSection, setActiveSection] = useState<AdminSection>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeRowMenu, setActiveRowMenu] = useState<RowMenuState | null>(null);
  const [storeTab, setStoreTab] = useState<StoreTab>("tenants");
  const [platformTab, setPlatformTab] = useState<PlatformTab>("accounts");
  const [notificationTab, setNotificationTab] = useState<NotificationTab>("system");
  const [reportTab, setReportTab] = useState<ReportTab>("tenant");
  const [auditTab, setAuditTab] = useState<AuditTab>("events");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("platform");
  const [openNavGroups, setOpenNavGroups] = useState<Record<NavGroupKey, boolean>>({
    operations: true,
    platform: true,
    governance: true
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expiringFilter, setExpiringFilter] = useState("");
  const [selectedTenantCode, setSelectedTenantCode] = useState("");
  const [detailTenantCode, setDetailTenantCode] = useState<string | null>(null);
  const [tenantPanelTab, setTenantPanelTab] = useState<"summary" | "actions" | "store" | "renew">("summary");
  const [tenantDetailViewTab, setTenantDetailViewTab] = useState<"overview" | "branches" | "billing" | "staff">("overview");
  const [tenantInlineActionMode, setTenantInlineActionMode] = useState<TenantInlineActionMode>("list");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedRoleKey, setSelectedRoleKey] = useState("");
  const [selectedTicketIndex, setSelectedTicketIndex] = useState<number | null>(null);
  const [showTenantDrawer, setShowTenantDrawer] = useState(false);
  const [showPlatformDrawer, setShowPlatformDrawer] = useState(false);
  const [showRoleDrawer, setShowRoleDrawer] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showPasswordDrawer, setShowPasswordDrawer] = useState(false);
  const [tenantStatusTarget, setTenantStatusTarget] = useState<TenantStatusTarget | null>(null);
  const [renewalTenantCode, setRenewalTenantCode] = useState<string | null>(null);
  const [renewalMonths, setRenewalMonths] = useState(12);
  const [renewalKeyInput, setRenewalKeyInput] = useState("");
  const [renewalNote, setRenewalNote] = useState("");
  const [generatedRenewalKey, setGeneratedRenewalKey] = useState<string | null>(null);
  const [tenantPlanDraft, setTenantPlanDraft] = useState({
    subscriptionPlan: "standard",
    note: "",
    createdAt: "",
    subscriptionExpiresAt: ""
  });
  const [tenantPlanActionMode, setTenantPlanActionMode] = useState<"change-plan" | "renew-by-days">("change-plan");
  const [tenantRenewDaysDraft, setTenantRenewDaysDraft] = useState(30);
  const [tenantStatusDraft, setTenantStatusDraft] = useState({
    reason: "",
    note: "",
    confirmTenantCode: ""
  });
  const [selectedSchemaCode, setSelectedSchemaCode] = useState("");
  const [employeeRoleInput, setEmployeeRoleInput] = useState("");
  const [tenantRoleInput, setTenantRoleInput] = useState("");
  const [tenantAccessLevel, setTenantAccessLevel] = useState("admin");
  const [tenantAccessStatus, setTenantAccessStatus] = useState("active");
  const [rolePermissionInput, setRolePermissionInput] = useState("");
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phone: ""
  });
  const [selfPasswordValue, setSelfPasswordValue] = useState("");
  const [storesByTenantCode, setStoresByTenantCode] = useState<Record<string, StoreSummaryResponse[]>>({});
  const [createStoreForm, setCreateStoreForm] = useState({
    branchCode: "",
    branchName: "",
    sourceSchemaName: ""
  });

  const [createTenantSchemaForm, setCreateTenantSchemaForm] = useState({
    tenantCode: "",
    schemaName: "",
    legalName: "",
    brandName: "",
    subscriptionPlan: "standard",
    status: "trial",
    responsibleAccountId: ""
  });

  const [updateTenantSchemaForm, setUpdateTenantSchemaForm] = useState({
    legalName: "",
    brandName: "",
    subscriptionPlan: "standard",
    status: "active",
    responsibleAccountId: "",
    createdAt: "",
    subscriptionExpiresAt: ""
  });

  const [updateEmployeeForm, setUpdateEmployeeForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    status: "active",
    platformAdmin: false
  });

  const [createPlatformAdminForm, setCreatePlatformAdminForm] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    role: "PLATFORM_ADMIN",
    tenantCode: ""
  });

  const [createRoleForm, setCreateRoleForm] = useState({
    roleKey: "",
    roleName: "",
    roleScope: "platform" as "platform" | "tenant",
    permissionKeys: ""
  });
  const bootstrapQuery = useQuery({
    queryKey: ["crm-bootstrap", token],
    queryFn: () => getCrmBootstrap(token),
    enabled: Boolean(token)
  });

  const analyticsQuery = useQuery({
    queryKey: ["crm-analytics", token],
    queryFn: () => getCrmAnalytics(token),
    enabled: Boolean(token)
  });

  const enterprisesQuery = useQuery({
    queryKey: ["crm-enterprises", token, searchTerm, planFilter, statusFilter, expiringFilter],
    queryFn: () =>
      getCrmEnterprises(token, {
        search: searchTerm.trim() || undefined,
        subscriptionPlan: planFilter || undefined,
        status: statusFilter || undefined,
        expiringInDays: expiringFilter ? Number(expiringFilter) : undefined
      }),
    enabled: Boolean(token)
  });

  const tenantSchemasQuery = useQuery({
    queryKey: ["crm-tenant-schemas", token],
    queryFn: () => getCrmTenantSchemas(token),
    enabled: Boolean(token)
  });

  const employeesQuery = useQuery({
    queryKey: ["crm-employees", token],
    queryFn: () => getCrmEmployees(token),
    enabled: Boolean(token)
  });

  const rolesQuery = useQuery({
    queryKey: ["crm-roles", token],
    queryFn: () => getCrmRoles(token),
    enabled: Boolean(token)
  });

  const bootstrap = bootstrapQuery.data;
  const analytics = analyticsQuery.data;
  const enterprises = enterprisesQuery.data ?? [];
  const enterprisesErrorMessage = enterprisesQuery.error instanceof Error ? enterprisesQuery.error.message : null;
  const tenantSchemas = tenantSchemasQuery.data ?? [];
  const employees = employeesQuery.data ?? [];
  const roleSummaries = rolesQuery.data ?? [];
  const roleSet = useMemo(() => new Set(session?.roles ?? []), [session?.roles]);
  const canAdminActions = roleSet.has("SUPER_ADMIN") || roleSet.has("PLATFORM_ADMIN");
  const canBillingActions = roleSet.has("PLATFORM_BILLING");
  const canSupportActions = roleSet.has("PLATFORM_SUPPORT");
  const canSalesActions = roleSet.has("PLATFORM_SALES");
  const canDirectRenew = canAdminActions || canBillingActions;
  const canCreateRenewalKey = canAdminActions || canBillingActions;
  const canRenewWithKey = canSupportActions || canSalesActions;
  const canManageChildStores = canAdminActions;
  const canAccessRenewTab = canDirectRenew || canRenewWithKey;
  const platformRoleSummaries = useMemo(
    () => roleSummaries.filter((role) => role.roleScope === "platform"),
    [roleSummaries]
  );

  function toDateInputValue(isoValue: string | null | undefined): string {
    if (!isoValue) {
      return "";
    }
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function toIsoFromDateInput(dateValue: string): string | undefined {
    const normalized = dateValue.trim();
    if (!normalized) {
      return undefined;
    }
    const [yearRaw, monthRaw, dayRaw] = normalized.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return undefined;
    }
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).toISOString();
  }

  useEffect(() => {
    const firstTenant = enterprises[0]?.tenantCode ?? bootstrap?.tenants[0]?.tenantCode ?? tenantSchemas[0]?.tenantCode ?? "";
    if (!selectedTenantCode && firstTenant) {
      setSelectedTenantCode(firstTenant);
    }
  }, [bootstrap, enterprises, selectedTenantCode, tenantSchemas]);

  useEffect(() => {
    if (params.tenantCode) {
      setActiveSection("stores");
      setSelectedTenantCode(params.tenantCode);
    }
  }, [params.tenantCode]);

  useEffect(() => {
    const schemaName = buildTenantSchemaName(createTenantSchemaForm.tenantCode);
    if (schemaName !== createTenantSchemaForm.schemaName) {
      setCreateTenantSchemaForm((prev) => ({ ...prev, schemaName }));
    }
  }, [createTenantSchemaForm.schemaName, createTenantSchemaForm.tenantCode]);

  useEffect(() => {
    if (!selectedEmployeeId && employees[0]?.id) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (!selectedRoleKey && platformRoleSummaries[0]?.roleKey) {
      setSelectedRoleKey(platformRoleSummaries[0].roleKey);
    }
  }, [platformRoleSummaries, selectedRoleKey]);

  useEffect(() => {
    const role = platformRoleSummaries.find((item) => item.roleKey === selectedRoleKey);
    setRolePermissionInput(role ? role.permissionKeys.join(", ") : "");
  }, [platformRoleSummaries, selectedRoleKey]);

  useEffect(() => {
    const tenant = tenantSchemas.find((item) => item.tenantCode === selectedSchemaCode);
    if (!tenant) {
      return;
    }
    setUpdateTenantSchemaForm({
      legalName: tenant.legalName,
      brandName: tenant.brandName ?? "",
      subscriptionPlan: tenant.subscriptionPlan,
      status: tenant.status,
      responsibleAccountId: tenant.responsibleAccountId ?? "",
      createdAt: toDateInputValue(tenant.createdAt),
      subscriptionExpiresAt: toDateInputValue(tenant.subscriptionExpiresAt)
    });
  }, [selectedSchemaCode, tenantSchemas]);

  useEffect(() => {
    const employee = employees.find((item) => item.id === selectedEmployeeId);
    if (!employee) {
      return;
    }

    setUpdateEmployeeForm({
      fullName: employee.fullName,
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      status: employee.status,
      platformAdmin: employee.platformAdmin
    });
    setEmployeeRoleInput(employee.platformRoles.join(", "));

    const access = employee.tenantAccesses.find((item) => item.tenantCode === selectedTenantCode);
    if (access) {
      setTenantRoleInput(access.roles.join(", "));
      setTenantAccessLevel(access.accessLevel);
      setTenantAccessStatus(access.status);
    } else {
      setTenantRoleInput("");
      setTenantAccessLevel("admin");
      setTenantAccessStatus("active");
    }
  }, [employees, selectedEmployeeId, selectedTenantCode]);

  useEffect(() => {
    const account = employees.find((item) => item.username === session?.username);
    if (!account) {
      return;
    }

    setProfileForm({
      fullName: account.fullName,
      email: account.email ?? "",
      phone: account.phone ?? ""
    });
  }, [employees, session?.username]);

  useEffect(() => {
    if (!activeRowMenu) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!(event.target instanceof Element) || !event.target.closest(".row-menu, .floating-row-menu")) {
        setActiveRowMenu(null);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveRowMenu(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [activeRowMenu]);

  useEffect(() => {
    if (tenantPanelTab === "store" && !canManageChildStores) {
      setTenantPanelTab("summary");
      return;
    }
    if (tenantPanelTab === "renew" && !canAccessRenewTab) {
      setTenantPanelTab("summary");
    }
  }, [canAccessRenewTab, canManageChildStores, tenantPanelTab]);

  const tenantRows = useMemo(() => {
    const tenantSchemaByCode = new Map(tenantSchemas.map((item) => [item.tenantCode, item]));
    const now = Date.now();
    return enterprises.map((enterprise) => {
      const schema = tenantSchemaByCode.get(enterprise.tenantCode);
      const expiryTime = enterprise.subscriptionExpiresAt ? new Date(enterprise.subscriptionExpiresAt).getTime() : null;
      const isExpired = typeof expiryTime === "number" && expiryTime < now;
      return {
        ...enterprise,
        schemaName: enterprise.schemaName || schema?.schemaName || buildTenantSchemaName(enterprise.tenantCode),
        brandName: enterprise.primaryDomain ?? schema?.brandName ?? null,
        responsibleAccountId: enterprise.responsibleAccountId ?? schema?.responsibleAccountId ?? null,
        responsibleUsername: enterprise.responsibleUsername ?? schema?.responsibleUsername ?? null,
        responsibleFullName: enterprise.responsibleFullName ?? schema?.responsibleFullName ?? null,
        displayExpiry: isExpired ? "Da het han" : formatExpiryDate(enterprise.subscriptionExpiresAt),
        subscriptionAmount: planPriceMap[enterprise.subscriptionPlan.toLowerCase()] ?? 0,
        isExpired
      };
    });
  }, [enterprises, tenantSchemas]);

  const filteredTenantRows = tenantRows;

  useEffect(() => {
    if (!token || storeTab !== "tenants" || !detailTenantCode) {
      return;
    }

    if (storesByTenantCode[detailTenantCode] !== undefined) {
      return;
    }

    let disposed = false;
    getCrmStores(token, detailTenantCode)
      .then((storesOfTenant) => {
        if (disposed) {
          return;
        }
        setStoresByTenantCode((prev) => ({
          ...prev,
          [detailTenantCode]: storesOfTenant
        }));
      })
      .catch(() => {
        if (disposed) {
          return;
        }
        setStoresByTenantCode((prev) => ({
          ...prev,
          [detailTenantCode]: [] as StoreSummaryResponse[]
        }));
      });

    return () => {
      disposed = true;
    };
  }, [detailTenantCode, storeTab, storesByTenantCode, token]);

  const renewalTenant = renewalTenantCode
    ? tenantRows.find((item) => item.tenantCode === renewalTenantCode) ?? null
    : null;
  const renewalBaseDate = renewalTenant?.subscriptionExpiresAt
    ? new Date(renewalTenant.subscriptionExpiresAt)
    : new Date();
  const renewalPreviewDate = new Date(renewalBaseDate);
  renewalPreviewDate.setMonth(renewalPreviewDate.getMonth() + renewalMonths);
  const detailTenant = detailTenantCode
    ? tenantRows.find((item) => item.tenantCode === detailTenantCode) ?? null
    : null;
  const detailTenantStores = detailTenant ? storesByTenantCode[detailTenant.tenantCode] ?? [] : [];
  const editingTenantSummary = tenantRows.find((item) => item.tenantCode === selectedSchemaCode) ?? null;
  const selectedEmployee = employees.find((item) => item.id === selectedEmployeeId) ?? null;
  const currentUserAccount = employees.find((item) => item.username === session?.username) ?? null;
  const selectedRole = platformRoleSummaries.find((item) => item.roleKey === selectedRoleKey) ?? null;
  const platformAccounts = employees.filter((item) => item.platformAdmin || item.platformRoles.length > 0);
  const tenantOwnerAccounts = employees.flatMap((employee) =>
    employee.tenantAccesses
      .filter((access) => access.accessLevel === "owner")
      .map((access) => ({
        id: `${employee.id}-${access.tenantCode}`,
        username: employee.username,
        email: employee.email ?? "-",
        tenantCode: access.tenantCode,
        status: access.status,
        lastLogin: access.tenantCode === selectedTenantCode ? "2h truoc" : "1 ngay truoc"
      }))
  );

  const dashboard = analytics?.dashboard;
  const systemRevenue = dashboard?.estimatedRevenue ?? tenantRows.reduce((sum, item) => sum + item.subscriptionAmount, 0);
  const expiringTenants = tenantRows.filter((item) => item.status === "trial").slice(0, 5);
  const tenantTotalCount = filteredTenantRows.length;
  const activeTenantCount = filteredTenantRows.filter((item) => item.status === "active").length;
  const suspendedTenantCount = filteredTenantRows.filter((item) => item.status === "suspended").length;
  const trialTenantCount = filteredTenantRows.filter((item) => item.status === "trial").length;

  function formatTenantRatio(count: number): string {
    if (tenantTotalCount === 0) {
      return "0%";
    }
    return `${((count / tenantTotalCount) * 100).toFixed(1)}%`;
  }

  const topbarNotificationCount = analytics?.supportTickets.filter((item) => item.status.toLowerCase() === "open").length
    ?? analytics?.supportTickets.length
    ?? 0;
  const adminTopbarMenuItems = [
    {
      key: "profile",
      label: "Thong tin ca nhan",
      iconClass: "fa-regular fa-user",
      onClick: handleViewUserInfo
    },
    {
      key: "password",
      label: "Doi mat khau",
      iconClass: "fa-solid fa-key",
      onClick: handleOpenChangePassword
    },
    {
      key: "logout",
      label: "Dang xuat",
      iconClass: "fa-solid fa-right-from-bracket",
      onClick: handleLogout,
      danger: true
    }
  ];

  const invalidateCoreQueries = async () => {
    setStoresByTenantCode({});
    await queryClient.invalidateQueries({ queryKey: ["crm-enterprises", token] });
    await queryClient.invalidateQueries({ queryKey: ["crm-bootstrap", token] });
    await queryClient.invalidateQueries({ queryKey: ["crm-analytics", token] });
    await queryClient.invalidateQueries({ queryKey: ["crm-tenant-schemas", token] });
    await queryClient.invalidateQueries({ queryKey: ["crm-employees", token] });
    await queryClient.invalidateQueries({ queryKey: ["crm-roles", token] });
  };

  const createTenantSchemaMutation = useMutation({
    mutationFn: () =>
      createCrmTenantSchema(token, {
        tenantCode: normalizeStoreCode(createTenantSchemaForm.tenantCode) || undefined,
        schemaName: createTenantSchemaForm.schemaName.trim().toLowerCase() || undefined,
        legalName: createTenantSchemaForm.legalName.trim(),
        brandName: createTenantSchemaForm.brandName.trim() || undefined,
        subscriptionPlan: createTenantSchemaForm.subscriptionPlan,
        status: createTenantSchemaForm.status,
        responsibleAccountId: createTenantSchemaForm.responsibleAccountId || undefined
      }),
    onSuccess: async (created) => {
      setCreateTenantSchemaForm({
        tenantCode: "",
        schemaName: "",
        legalName: "",
        brandName: "",
        subscriptionPlan: "standard",
        status: "trial",
        responsibleAccountId: ""
      });
      setSelectedTenantCode(created.tenantCode);
      setShowTenantDrawer(false);
      await invalidateCoreQueries();
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the tao cua hang");
    }
  });

  const createStoreMutation = useMutation({
    mutationFn: () => {
      if (!detailTenant) {
        throw new Error("Khong tim thay doanh nghiep dang xem");
      }
      return createCrmStore(token, {
        tenantCode: detailTenant.tenantCode,
        branchCode: createStoreForm.branchCode.trim().toLowerCase(),
        branchName: createStoreForm.branchName.trim(),
        sourceSchemaName: createStoreForm.sourceSchemaName.trim() || detailTenant.schemaName || buildTenantSchemaName(detailTenant.tenantCode)
      });
    },
    onSuccess: async () => {
      setCreateStoreForm({
        branchCode: "",
        branchName: "",
        sourceSchemaName: ""
      });
      setTenantPanelTab("summary");
      await invalidateCoreQueries();
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the tao cua hang con");
    }
  });

  const updateTenantSchemaMutation = useMutation({
    mutationFn: () => {
      const tenant = tenantRows.find((item) => item.tenantCode === selectedSchemaCode);
      if (!tenant) {
        throw new Error("Khong tim thay doanh nghiep can cap nhat");
      }

      const payload: {
        legalName?: string;
        brandName?: string;
        subscriptionPlan?: string;
        status?: string;
        responsibleAccountId?: string;
        createdAt?: string;
        subscriptionExpiresAt?: string;
      } = {};

      const legalName = updateTenantSchemaForm.legalName.trim();
      if (legalName && legalName !== tenant.legalName) {
        payload.legalName = legalName;
      }

      const brandName = updateTenantSchemaForm.brandName.trim();
      const currentBrandName = (tenant.brandName ?? "").trim();
      if (brandName !== currentBrandName) {
        payload.brandName = brandName;
      }

      const nextPlan = updateTenantSchemaForm.subscriptionPlan.trim().toLowerCase();
      const currentPlan = tenant.subscriptionPlan.trim().toLowerCase();
      if (nextPlan && nextPlan !== currentPlan) {
        payload.subscriptionPlan = nextPlan;
      }

      const nextStatus = updateTenantSchemaForm.status.trim().toLowerCase();
      const currentStatus = tenant.status.trim().toLowerCase();
      if (nextStatus && nextStatus !== currentStatus) {
        payload.status = nextStatus;
      }

      if (
        updateTenantSchemaForm.responsibleAccountId
        && updateTenantSchemaForm.responsibleAccountId !== (tenant.responsibleAccountId ?? "")
      ) {
        payload.responsibleAccountId = updateTenantSchemaForm.responsibleAccountId;
      }

      if (updateTenantSchemaForm.createdAt !== toDateInputValue(tenant.createdAt)) {
        const createdAt = toIsoFromDateInput(updateTenantSchemaForm.createdAt);
        if (createdAt) {
          payload.createdAt = createdAt;
        }
      }

      if (updateTenantSchemaForm.subscriptionExpiresAt !== toDateInputValue(tenant.subscriptionExpiresAt)) {
        const subscriptionExpiresAt = toIsoFromDateInput(updateTenantSchemaForm.subscriptionExpiresAt);
        if (subscriptionExpiresAt) {
          payload.subscriptionExpiresAt = subscriptionExpiresAt;
        }
      }

      if (Object.keys(payload).length === 0) {
        throw new Error("Khong co thong tin thay doi de cap nhat");
      }

      return updateCrmTenantSchema(token, selectedSchemaCode, payload);
    },
    onSuccess: async () => {
      setShowTenantDrawer(false);
      setTenantInlineActionMode("list");
      setTenantPanelTab("summary");
      await invalidateCoreQueries();
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the cap nhat cua hang");
    }
  });

  const renewTenantMutation = useMutation({
    mutationFn: () => {
      if (!renewalTenantCode) {
        throw new Error("tenantCode is required");
      }
      return renewCrmTenantSubscription(token, renewalTenantCode, {
        extendMonths: canDirectRenew ? renewalMonths : undefined,
        renewalKey: canDirectRenew ? undefined : renewalKeyInput.trim(),
        note: renewalNote.trim() || undefined
      });
    },
    onSuccess: async () => {
      setRenewalTenantCode(null);
      setRenewalKeyInput("");
      setRenewalNote("");
      setGeneratedRenewalKey(null);
      await invalidateCoreQueries();
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the gia han doanh nghiep");
    }
  });

  const createRenewalKeyMutation = useMutation({
    mutationFn: () => {
      if (!renewalTenantCode) {
        throw new Error("tenantCode is required");
      }
      return createCrmRenewalKey(token, renewalTenantCode, {
        extendMonths: renewalMonths,
        validDays: 7,
        note: renewalNote.trim() || undefined
      });
    },
    onSuccess: (response) => {
      setGeneratedRenewalKey(response.keyCode);
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the tao ma gia han");
    }
  });

  const updateTenantBillingMutation = useMutation({
    mutationFn: (
      input:
        | {
          mode: "plan";
          tenantCode: string;
          payload: {
            subscriptionPlan: string;
            note?: string;
            createdAt?: string;
            subscriptionExpiresAt?: string;
          };
        }
        | {
          mode: "dates";
          tenantCode: string;
          payload: {
            createdAt?: string;
            subscriptionExpiresAt?: string;
          };
        }
    ) => {
      if (input.mode === "plan") {
        return updateCrmTenantSubscriptionPlan(token, input.tenantCode, input.payload);
      }
      return updateCrmTenantSchema(token, input.tenantCode, input.payload);
    },
    onSuccess: async () => {
      setTenantInlineActionMode("list");
      setTenantPlanDraft({
        subscriptionPlan: "standard",
        note: "",
        createdAt: "",
        subscriptionExpiresAt: ""
      });
      setTenantPlanActionMode("change-plan");
      setTenantRenewDaysDraft(30);
      await invalidateCoreQueries();
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the cap nhat goi");
    }
  });

  const updateTenantStatusMutation = useMutation({
    mutationFn: ({ tenantCode, status }: { tenantCode: string; status: string }) =>
      updateCrmTenantSchema(token, tenantCode, { status }),
    onSuccess: async () => {
      setTenantInlineActionMode("list");
      setTenantStatusTarget(null);
      setTenantStatusDraft({
        reason: "",
        note: "",
        confirmTenantCode: ""
      });
      await invalidateCoreQueries();
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the cap nhat trang thai doanh nghiep");
    }
  });

  const createPlatformAdminMutation = useMutation({
    mutationFn: () =>
      createCrmEmployee(token, {
        username: createPlatformAdminForm.username.trim(),
        password: "Temp@1234",
        fullName: createPlatformAdminForm.fullName.trim(),
        email: createPlatformAdminForm.email.trim() || undefined,
        phone: createPlatformAdminForm.phone.trim() || undefined,
        status: "active",
        platformAdmin: true,
        platformRoleKeys: [createPlatformAdminForm.role]
      }),
    onSuccess: async () => {
      setCreatePlatformAdminForm({
        fullName: "",
        username: "",
        email: "",
        phone: "",
        role: platformRoleSummaries[0]?.roleKey ?? "PLATFORM_ADMIN",
        tenantCode: ""
      });
      setShowPlatformDrawer(false);
      await invalidateCoreQueries();
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the tao tai khoan quan tri");
    }
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: () =>
      updateCrmEmployee(token, selectedEmployeeId, {
        fullName: updateEmployeeForm.fullName.trim(),
        email: updateEmployeeForm.email.trim() || undefined,
        phone: updateEmployeeForm.phone.trim() || undefined,
        status: updateEmployeeForm.status,
        platformAdmin: updateEmployeeForm.platformAdmin
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-employees", token] });
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the cap nhat tai khoan");
    }
  });

  const updateEmployeePasswordMutation = useMutation({
    mutationFn: () => updateCrmEmployeePassword(token, selectedEmployeeId, resetPasswordValue),
    onSuccess: async () => {
      setResetPasswordValue("");
      await queryClient.invalidateQueries({ queryKey: ["crm-employees", token] });
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the cap nhat mat khau");
    }
  });

  const updateCurrentUserProfileMutation = useMutation({
    mutationFn: () => {
      if (!currentUserAccount) {
        throw new Error("Khong tim thay tai khoan hien tai");
      }

      return updateCrmEmployee(token, currentUserAccount.id, {
        fullName: profileForm.fullName.trim(),
        email: profileForm.email.trim() || undefined,
        phone: profileForm.phone.trim() || undefined,
        status: currentUserAccount.status,
        platformAdmin: currentUserAccount.platformAdmin
      });
    },
    onSuccess: async (updatedAccount) => {
      if (session) {
        setSession({ ...session, fullName: updatedAccount.fullName });
      }
      setShowProfileDrawer(false);
      await queryClient.invalidateQueries({ queryKey: ["crm-employees", token] });
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the cap nhat thong tin tai khoan");
    }
  });

  const updateCurrentUserPasswordMutation = useMutation({
    mutationFn: () => {
      if (!currentUserAccount) {
        throw new Error("Khong tim thay tai khoan hien tai");
      }

      return updateCrmEmployeePassword(token, currentUserAccount.id, selfPasswordValue);
    },
    onSuccess: async () => {
      setSelfPasswordValue("");
      setShowPasswordDrawer(false);
      await queryClient.invalidateQueries({ queryKey: ["crm-employees", token] });
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the doi mat khau");
    }
  });

  const disableEmployeeMutation = useMutation({
    mutationFn: (accountId: string) => disableCrmEmployee(token, accountId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-employees", token] });
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the vo hieu tai khoan");
    }
  });

  const updatePlatformRolesMutation = useMutation({
    mutationFn: () => updateCrmPlatformRoles(token, selectedEmployeeId, parseRoleInput(employeeRoleInput)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-employees", token] });
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the cap nhat vai tro quan tri");
    }
  });

  const upsertTenantAccessMutation = useMutation({
    mutationFn: () =>
      upsertCrmTenantAccess(token, selectedEmployeeId, selectedTenantCode, {
        accessLevel: tenantAccessLevel,
        status: tenantAccessStatus,
        roleKeys: parseRoleInput(tenantRoleInput)
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-employees", token] });
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the luu quyen cua hang");
    }
  });

  const removeTenantAccessMutation = useMutation({
    mutationFn: () => removeCrmTenantAccess(token, selectedEmployeeId, selectedTenantCode),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-employees", token] });
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the xoa quyen cua hang");
    }
  });

  const createRoleMutation = useMutation({
    mutationFn: () =>
      createCrmRole(token, {
        roleKey: createRoleForm.roleKey.trim().toUpperCase(),
        roleName: createRoleForm.roleName.trim(),
        roleScope: createRoleForm.roleScope,
        permissionKeys: parsePermissionInput(createRoleForm.permissionKeys)
      }),
    onSuccess: async (createdRole) => {
      setCreateRoleForm({
        roleKey: "",
        roleName: "",
        roleScope: "platform",
        permissionKeys: ""
      });
      setSelectedRoleKey(createdRole.roleKey);
      setShowRoleDrawer(false);
      await queryClient.invalidateQueries({ queryKey: ["crm-roles", token] });
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the tao vai tro");
    }
  });

  const updateRolePermissionsMutation = useMutation({
    mutationFn: () => updateCrmRolePermissions(token, selectedRoleKey, parsePermissionInput(rolePermissionInput)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm-roles", token] });
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the cap nhat quyen cho vai tro");
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: () => deleteCrmRole(token, selectedRoleKey),
    onSuccess: async () => {
      setSelectedRoleKey("");
      await queryClient.invalidateQueries({ queryKey: ["crm-roles", token] });
    },
    onError: (error) => {
      window.alert(error instanceof Error ? error.message : "Khong the xoa vai tro");
    }
  });

  const sectionToGroup: Record<AdminSection, NavGroupKey> = {
    dashboard: "operations",
    stores: "operations",
    customers: "operations",
    platform: "platform",
    notifications: "platform",
    reports: "governance",
    audit: "governance",
    settings: "governance"
  };

  function toggleNavGroup(group: NavGroupKey) {
    setOpenNavGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  }

  function goToSection(
    section: AdminSection,
    options?: {
      storeTab?: StoreTab;
      platformTab?: PlatformTab;
      notificationTab?: NotificationTab;
      reportTab?: ReportTab;
      auditTab?: AuditTab;
      settingsTab?: SettingsTab;
    }
  ) {
    setActiveSection(section);
    setOpenNavGroups((prev) => ({ ...prev, [sectionToGroup[section]]: true }));
    if (options?.storeTab) {
      setStoreTab(options.storeTab);
    }
    if (options?.platformTab) {
      setPlatformTab(options.platformTab);
    }
    if (options?.notificationTab) {
      setNotificationTab(options.notificationTab);
    }
    if (options?.reportTab) {
      setReportTab(options.reportTab);
    }
    if (options?.auditTab) {
      setAuditTab(options.auditTab);
    }
    if (options?.settingsTab) {
      setSettingsTab(options.settingsTab);
    }
  }

  function handleLogout() {
    clearSession();
    navigate("/admin.login", { replace: true });
  }

  function handleViewUserInfo() {
    setShowProfileDrawer(true);
  }

  function handleOpenChangePassword() {
    setSelfPasswordValue("");
    setShowPasswordDrawer(true);
  }

  function openRenewalModal(tenantCode: string) {
    if (!canAccessRenewTab) {
      return;
    }
    setActiveRowMenu(null);
    setTenantInlineActionMode("list");
    setTenantStatusTarget(null);
    setRenewalMonths(12);
    setRenewalKeyInput("");
    setRenewalNote("");
    setGeneratedRenewalKey(null);
    if (activeSection === "stores") {
      setSelectedTenantCode(tenantCode);
      setDetailTenantCode(tenantCode);
      setTenantDetailViewTab("billing");
      setTenantPanelTab("renew");
      setRenewalTenantCode(tenantCode);
      return;
    }
    setRenewalTenantCode(tenantCode);
  }

  function openTenantDetailModal(tenantCode: string) {
    setActiveRowMenu(null);
    setTenantInlineActionMode("list");
    setTenantStatusTarget(null);
    setSelectedTenantCode(tenantCode);
    setDetailTenantCode(tenantCode);
    setTenantDetailViewTab("overview");
    setTenantPanelTab("summary");
  }

  function switchTenantDetailTab(tab: "overview" | "branches" | "billing" | "staff") {
    setTenantDetailViewTab(tab);
    if (tenantPanelTab !== "summary") {
      setTenantPanelTab("summary");
    }
  }

  function openCreateStorePanel(tenantCode: string) {
    if (!canManageChildStores) {
      return;
    }
    setActiveRowMenu(null);
    setTenantInlineActionMode("list");
    setTenantStatusTarget(null);
    const tenant = tenantRows.find((item) => item.tenantCode === tenantCode);
    setSelectedTenantCode(tenantCode);
    setDetailTenantCode(tenantCode);
    setTenantDetailViewTab("branches");
    setTenantPanelTab("store");
    setCreateStoreForm((prev) => ({
      ...prev,
      sourceSchemaName: prev.sourceSchemaName || tenant?.schemaName || buildTenantSchemaName(tenantCode)
    }));
  }

  function openTenantProductDialog(tenantCode: string) {
    openTenantDetailModal(tenantCode);
  }

  function openTenantEditInlinePanel(tenantCode: string) {
    const tenant = tenantRows.find((item) => item.tenantCode === tenantCode);
    setActiveRowMenu(null);
    setSelectedTenantCode(tenantCode);
    setDetailTenantCode(tenantCode);
    setTenantDetailViewTab("overview");
    setTenantPanelTab("summary");
    setSelectedSchemaCode(tenantCode);
    setUpdateTenantSchemaForm({
      legalName: tenant?.legalName ?? "",
      brandName: tenant?.brandName ?? "",
      subscriptionPlan: tenant?.subscriptionPlan ?? "standard",
      status: tenant?.status ?? "active",
      responsibleAccountId: tenant?.responsibleAccountId ?? "",
      createdAt: toDateInputValue(tenant?.createdAt),
      subscriptionExpiresAt: toDateInputValue(tenant?.subscriptionExpiresAt)
    });
    setTenantStatusTarget(null);
    setTenantInlineActionMode("edit");
  }

  function openTenantPlanDialog(tenantCode: string) {
    setActiveRowMenu(null);
    const tenant = tenantRows.find((item) => item.tenantCode === tenantCode);
    setTenantPlanDraft({
      subscriptionPlan: tenant?.subscriptionPlan?.toLowerCase() ?? "standard",
      note: "",
      createdAt: toDateInputValue(tenant?.createdAt),
      subscriptionExpiresAt: toDateInputValue(tenant?.subscriptionExpiresAt)
    });
    setTenantPlanActionMode("change-plan");
    setTenantRenewDaysDraft(30);
    setSelectedTenantCode(tenantCode);
    setDetailTenantCode(tenantCode);
    setTenantDetailViewTab("billing");
    setTenantPanelTab("summary");
    setTenantStatusTarget(null);
    setTenantInlineActionMode("plan");
  }

  function openTenantStatusDialog(tenantCode: string, nextStatus: TenantStatusTarget) {
    setActiveRowMenu(null);
    const defaultReason = nextStatus === "active"
      ? "Mo lai doanh nghiep"
      : nextStatus === "suspended"
        ? "Tam ngung van hanh"
        : "Dong doanh nghiep";
    setTenantStatusDraft({
      reason: defaultReason,
      note: "",
      confirmTenantCode: ""
    });
    setSelectedTenantCode(tenantCode);
    setDetailTenantCode(tenantCode);
    setTenantDetailViewTab("overview");
    setTenantPanelTab("summary");
    setTenantStatusTarget(nextStatus);
    setTenantInlineActionMode("status");
  }

  function openTenantUtilityDialog(tenantCode: string, type: "impersonate" | "invoice") {
    setActiveRowMenu(null);
    setSelectedTenantCode(tenantCode);
    setDetailTenantCode(tenantCode);
    setTenantDetailViewTab(type === "invoice" ? "billing" : "staff");
    setTenantPanelTab("summary");
    setTenantStatusTarget(null);
    setTenantInlineActionMode(type);
  }

  function handleChangePlan(tenantCode: string) {
    openTenantPlanDialog(tenantCode);
  }

  function handleStatusAction(tenantCode: string, status: TenantStatusTarget) {
    openTenantStatusDialog(tenantCode, status);
  }

  function getTenantActions(tenantCode: string) {
    const actions: Array<{ key: string; label: string; icon: string; onClick: () => void; danger?: boolean }> = [];
    const tenant = tenantRows.find((item) => item.tenantCode === tenantCode);
    const tenantStatus = tenant?.status?.toLowerCase() ?? "active";

    actions.push({
      key: "products",
      label: "Xem chi tiet cua hang",
      icon: "fa-regular fa-eye",
      onClick: () => openTenantProductDialog(tenantCode)
    });

    if (canAccessRenewTab) {
      actions.push({
        key: "renew",
        label: "Gia han",
        icon: "fa-solid fa-calendar-plus",
        onClick: () => openRenewalModal(tenantCode)
      });
    }

    if (canManageChildStores) {
      actions.push({
        key: "create-store",
        label: "Them cua hang con",
        icon: "fa-solid fa-store",
        onClick: () => openCreateStorePanel(tenantCode)
      });
    }

    if (canAdminActions) {
      actions.push(
        {
          key: "edit",
          label: "Sua thong tin",
          icon: "fa-regular fa-pen-to-square",
          onClick: () => openTenantEditInlinePanel(tenantCode)
        },
        {
          key: "upgrade",
          label: "Doi goi",
          icon: "fa-solid fa-layer-group",
          onClick: () => handleChangePlan(tenantCode)
        },
        ...(tenantStatus !== "active"
          ? [{
              key: "activate",
              label: tenantStatus === "trial" ? "Kich hoat" : "Kich hoat lai",
              icon: "fa-solid fa-play",
              onClick: () => handleStatusAction(tenantCode, "active")
            }]
          : []),
        ...(tenantStatus !== "suspended" && tenantStatus !== "closed"
          ? [{
              key: "suspend",
              label: "Tam ngung",
              icon: "fa-solid fa-pause",
              onClick: () => handleStatusAction(tenantCode, "suspended")
            }]
          : []),
        ...(tenantStatus !== "closed"
          ? [{
              key: "close",
              label: "Dong doanh nghiep",
              icon: "fa-solid fa-circle-xmark",
              danger: true,
              onClick: () => handleStatusAction(tenantCode, "closed")
            }]
          : []),
        {
          key: "impersonate",
          label: "Dang nhap ho tro",
          icon: "fa-solid fa-headset",
          onClick: () => openTenantUtilityDialog(tenantCode, "impersonate")
        }
      );
      return actions;
    }

    if (canBillingActions) {
      actions.push(
        {
          key: "upgrade",
          label: "Doi goi",
          icon: "fa-solid fa-layer-group",
          onClick: () => handleChangePlan(tenantCode)
        },
        {
          key: "invoice",
          label: "Xuat hoa don",
          icon: "fa-solid fa-file-invoice-dollar",
          onClick: () => openTenantUtilityDialog(tenantCode, "invoice")
        }
      );
      return actions;
    }

    if (canSupportActions || canSalesActions) {
      actions.push(
        {
          key: "support",
          label: "Ho tro",
          icon: "fa-solid fa-headset",
          onClick: () => {
            goToSection("notifications", { notificationTab: "tickets" });
          }
        },
        {
          key: "accounts",
          label: "Xem tai khoan",
          icon: "fa-solid fa-users",
          onClick: () => {
            goToSection("customers");
          }
        }
      );
    }

    return actions;
  }

  function toggleRowMenu(event: ReactMouseEvent<HTMLButtonElement>, tenantCode: string) {
    event.stopPropagation();

    if (activeRowMenu?.tenantCode === tenantCode) {
      setActiveRowMenu(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 240;
    const actionCount = getTenantActions(tenantCode).length;
    const estimatedHeight = Math.min(actionCount * 44 + 16, 320);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedHeight && rect.top > spaceBelow;
    const top = openUpward
      ? Math.max(12, rect.top - estimatedHeight - 8)
      : Math.min(window.innerHeight - estimatedHeight - 12, rect.bottom + 8);
    const left = Math.min(
      Math.max(12, rect.right - menuWidth),
      window.innerWidth - menuWidth - 12
    );

    setActiveRowMenu({
      tenantCode,
      top,
      left
    });
  }

  function submitTenantPlanDialog() {
    if (!detailTenant) {
      return;
    }

    if (!canAdminActions && !canBillingActions) {
      window.alert("Ban khong co quyen cap nhat goi dich vu");
      return;
    }

    if (tenantPlanActionMode === "renew-by-days") {
      if (!canAdminActions && tenantRenewDaysDraft > 365) {
        window.alert("Billing chi duoc gia han toi da 365 ngay moi lan");
        return;
      }

      const extendDays = Math.max(1, Math.floor(tenantRenewDaysDraft));
      const baseDate = detailTenant.subscriptionExpiresAt ? new Date(detailTenant.subscriptionExpiresAt) : new Date();
      const safeBaseDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
      const nextExpiryDate = new Date(safeBaseDate);
      nextExpiryDate.setDate(nextExpiryDate.getDate() + extendDays);

      updateTenantBillingMutation.mutate({
        mode: "dates",
        tenantCode: detailTenant.tenantCode,
        payload: {
          subscriptionExpiresAt: nextExpiryDate.toISOString()
        }
      });
      return;
    }

    const nextPlan = tenantPlanDraft.subscriptionPlan.trim().toLowerCase();
    const currentPlan = detailTenant.subscriptionPlan.trim().toLowerCase();
    const createdAtChanged = tenantPlanDraft.createdAt !== toDateInputValue(detailTenant.createdAt);
    const subscriptionExpiresAtChanged = tenantPlanDraft.subscriptionExpiresAt !== toDateInputValue(detailTenant.subscriptionExpiresAt);
    const createdAt = createdAtChanged ? toIsoFromDateInput(tenantPlanDraft.createdAt) : undefined;
    const subscriptionExpiresAt = subscriptionExpiresAtChanged ? toIsoFromDateInput(tenantPlanDraft.subscriptionExpiresAt) : undefined;

    if (!canAdminActions) {
      if (createdAtChanged) {
        window.alert("Chi admin moi duoc thay doi ngay tao");
        return;
      }

      if (subscriptionExpiresAtChanged && subscriptionExpiresAt) {
        const nextExpiryTime = new Date(subscriptionExpiresAt).getTime();
        const nowTime = Date.now();
        const currentExpiryTime = detailTenant.subscriptionExpiresAt
          ? new Date(detailTenant.subscriptionExpiresAt).getTime()
          : Number.NaN;
        const baselineTime = Number.isFinite(currentExpiryTime)
          ? Math.max(nowTime, currentExpiryTime)
          : nowTime;

        if (nextExpiryTime < baselineTime) {
          window.alert("Billing khong duoc giam han su dung hoac dat lui ve qua khu");
          return;
        }
      }
    }

    if (nextPlan && nextPlan !== currentPlan) {
      updateTenantBillingMutation.mutate({
        mode: "plan",
        tenantCode: detailTenant.tenantCode,
        payload: {
          subscriptionPlan: nextPlan,
          note: tenantPlanDraft.note.trim() || undefined,
          createdAt,
          subscriptionExpiresAt
        }
      });
      return;
    }

    if (createdAt || subscriptionExpiresAt) {
      updateTenantBillingMutation.mutate({
        mode: "dates",
        tenantCode: detailTenant.tenantCode,
        payload: {
          createdAt,
          subscriptionExpiresAt
        }
      });
      return;
    }

    window.alert("Khong co thong tin thay doi de cap nhat");
  }

  function submitTenantStatusDialog() {
    if (!detailTenant || !tenantStatusTarget) {
      return;
    }
    updateTenantStatusMutation.mutate({
      tenantCode: detailTenant.tenantCode,
      status: tenantStatusTarget
    });
  }

  function submitTenantUtilityDialog() {
    if (!detailTenant || (tenantInlineActionMode !== "impersonate" && tenantInlineActionMode !== "invoice")) {
      return;
    }

    const message = tenantInlineActionMode === "impersonate"
      ? `Phien dang nhap ho tro cho ${detailTenant.tenantCode} se duoc noi backend o buoc tiep theo.`
      : `Xuat hoa don cho ${detailTenant.tenantCode} se duoc noi API billing o buoc tiep theo.`;
    setTenantInlineActionMode("list");
    window.alert(message);
  }

  const currentTimestamp = Date.now();
  const expiringSoonCount = tenantRows.filter((item) => {
    if (!item.subscriptionExpiresAt || item.isExpired) {
      return false;
    }
    const expiryTime = new Date(item.subscriptionExpiresAt).getTime();
    return expiryTime >= currentTimestamp && expiryTime - currentTimestamp <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const expiredTenantCount = tenantRows.filter((item) => item.isExpired).length;
  const dashboardRangeLabel = formatCurrentMonthRange();
  const dashboardStats = [
    {
      label: "Tong doanh nghiep",
      value: tenantTotalCount,
      helper: "He thong dang quan ly",
      trendLabel: `${trialTenantCount} thu nghiem`,
      iconClass: "fa-regular fa-building",
      tone: "primary" as const,
      direction: "up" as const
    },
    {
      label: "Dang hoat dong",
      value: activeTenantCount,
      helper: `${formatTenantRatio(activeTenantCount)} tren tong so`,
      trendLabel: "Van hanh on dinh",
      iconClass: "fa-regular fa-circle-check",
      tone: "success" as const,
      direction: "up" as const
    },
    {
      label: "Sap het han (7 ngay)",
      value: expiringSoonCount,
      helper: "Can xu ly som",
      trendLabel: expiringSoonCount > 0 ? `${expiringSoonCount} muc can nhac` : "Khong co canh bao",
      iconClass: "fa-regular fa-clock",
      tone: "warning" as const,
      direction: expiringSoonCount > 0 ? ("down" as const) : ("flat" as const)
    },
    {
      label: "Da het han",
      value: expiredTenantCount,
      helper: "Can khoa hoac gia han",
      trendLabel: expiredTenantCount > 0 ? `${expiredTenantCount} doanh nghiep` : "Khong co",
      iconClass: "fa-regular fa-circle-xmark",
      tone: "danger" as const,
      direction: expiredTenantCount > 0 ? ("down" as const) : ("flat" as const)
    },
    {
      label: "MRR (thang nay)",
      value: `${formatMoney(systemRevenue)} d`,
      helper: "Doanh thu goi dich vu uoc tinh",
      trendLabel: `${tenantRows.filter((item) => item.subscriptionPlan.toLowerCase() === "pro").length} goi Pro`,
      iconClass: "fa-regular fa-credit-card",
      tone: "accent" as const,
      direction: "up" as const
    }
  ];
  const dashboardPlanBreakdown = [
    {
      label: "Standard",
      value: tenantRows.filter((item) => item.subscriptionPlan.toLowerCase() === "standard").length,
      color: "#22a699"
    },
    {
      label: "Pro",
      value: tenantRows.filter((item) => item.subscriptionPlan.toLowerCase() === "pro").length,
      color: "#2f6fed"
    },
    {
      label: "Enterprise",
      value: tenantRows.filter((item) => item.subscriptionPlan.toLowerCase() === "enterprise").length,
      color: "#ff8a1f"
    }
  ].map((item) => ({
    ...item,
    meta: `${item.value} (${tenantTotalCount === 0 ? 0 : Math.round((item.value / tenantTotalCount) * 100)}%)`
  }));
  const dashboardQuickActions = [
    {
      label: "Tao doanh nghiep moi",
      iconClass: "fa-solid fa-plus",
      onClick: () => {
        setSelectedSchemaCode("");
        setShowTenantDrawer(true);
      },
      tone: "primary" as const
    },
    {
      label: "Gan goi cho doanh nghiep",
      iconClass: "fa-solid fa-tags",
      onClick: () => goToSection("stores", { storeTab: "billing" })
    },
    {
      label: "Gia han goi",
      iconClass: "fa-regular fa-calendar-check",
      onClick: () => goToSection("stores", { storeTab: "tenants" })
    },
    {
      label: "Tao tai khoan quan tri",
      iconClass: "fa-regular fa-address-card",
      onClick: () => setShowPlatformDrawer(true)
    },
    {
      label: "Quan ly vai tro",
      iconClass: "fa-solid fa-key",
      onClick: () => goToSection("platform", { platformTab: "roles" })
    }
  ];
  const dashboardPrimarySeries = (analytics?.tenantGrowthSeries ?? []).slice(-6);
  const dashboardSecondarySeries = (analytics?.loginUsageSeries ?? []).slice(-6);
  const recentActivityItems = (analytics?.recentActivities ?? []).slice(0, 4).map((item, index) => ({
    id: `${item.title}-${index}`,
    title: item.title,
    meta: item.time,
    badge: "Moi",
    tone: "primary" as const
  }));
  const recentTenantItems = tenantRows.slice(0, 3).map((item) => ({
    id: item.tenantId,
    title: item.legalName,
    meta: `${item.tenantCode} - ${item.subscriptionPlan}`,
    badge: getVietnameseStatusLabel(item.status),
    tone: item.isExpired ? ("danger" as const) : ("success" as const)
  }));
  const topRevenueRows = [...tenantRows]
    .sort((left, right) => right.subscriptionAmount - left.subscriptionAmount)
    .slice(0, 5)
    .map((item) => ({
      label: item.legalName,
      value: `${formatMoney(item.subscriptionAmount)} d`
    }));

  const activeTenantActionTitle = tenantInlineActionMode === "edit"
    ? "Chinh sua doanh nghiep"
    : tenantInlineActionMode === "plan"
      ? "Doi goi dich vu"
      : tenantInlineActionMode === "status"
        ? "Cap nhat trang thai"
        : tenantInlineActionMode === "impersonate"
          ? "Dang nhap ho tro"
          : tenantInlineActionMode === "invoice"
            ? "Billing / hoa don"
            : "Chua chon chuc nang";

  const tenantActionWorkspaceContent = detailTenant ? (
    <>
      {tenantInlineActionMode === "edit" ? (
        <form className="form-grid" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          updateTenantSchemaMutation.mutate();
        }}>
          <label>Ma cua hang<input value={normalizeStoreCode(detailTenant.tenantCode)} readOnly /></label>
          <label>Ma chuoi (ID Admin Store)<input value={getChainAccessCode(detailTenant.schemaName ?? "", detailTenant.tenantCode)} readOnly /></label>
          <p className="section-note">Schema noi bo: {detailTenant.schemaName || buildTenantSchemaName(detailTenant.tenantCode)}</p>
          <label>Ten phap nhan *<input value={updateTenantSchemaForm.legalName} onChange={(event) => setUpdateTenantSchemaForm((prev) => ({ ...prev, legalName: event.target.value }))} required /></label>
          <label>Ten thuong hieu<input value={updateTenantSchemaForm.brandName} onChange={(event) => setUpdateTenantSchemaForm((prev) => ({ ...prev, brandName: event.target.value }))} /></label>
          <label>
            Goi dich vu
            <select value={updateTenantSchemaForm.subscriptionPlan} onChange={(event) => setUpdateTenantSchemaForm((prev) => ({ ...prev, subscriptionPlan: event.target.value }))}>
              <option value="standard">standard</option>
              <option value="pro">pro</option>
              <option value="enterprise">enterprise</option>
            </select>
          </label>
          <label>
            Trang thai
            <select value={updateTenantSchemaForm.status} onChange={(event) => setUpdateTenantSchemaForm((prev) => ({ ...prev, status: event.target.value }))}>
              <option value="trial">Thu nghiem</option>
              <option value="active">Dang dung</option>
              <option value="suspended">Tam ngung</option>
              <option value="closed">Da dong</option>
            </select>
          </label>
          <label>
            Nguoi phu trach
            <select value={updateTenantSchemaForm.responsibleAccountId} onChange={(event) => setUpdateTenantSchemaForm((prev) => ({ ...prev, responsibleAccountId: event.target.value }))}>
              <option value="">-- Chua gan --</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.username}</option>)}
            </select>
          </label>
          <label>
            Ngay tao
            <input
              type="date"
              value={updateTenantSchemaForm.createdAt}
              onChange={(event) => setUpdateTenantSchemaForm((prev) => ({ ...prev, createdAt: event.target.value }))}
            />
          </label>
          <label>
            Han su dung
            <input
              type="date"
              value={updateTenantSchemaForm.subscriptionExpiresAt}
              onChange={(event) => setUpdateTenantSchemaForm((prev) => ({ ...prev, subscriptionExpiresAt: event.target.value }))}
            />
          </label>
          <div className="button-row">
            <button className="ghost-button" type="button" onClick={() => setTenantInlineActionMode("list")}>Quay lai</button>
            <button className="primary-button" type="submit" disabled={updateTenantSchemaMutation.isPending}>{updateTenantSchemaMutation.isPending ? "Dang luu..." : "Luu doanh nghiep"}</button>
          </div>
        </form>
      ) : null}

      {tenantInlineActionMode === "plan" ? (
        <form className="form-grid" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          submitTenantPlanDialog();
        }}>
          <label>
            Kieu cap nhat
            <select
              value={tenantPlanActionMode}
              onChange={(event) => setTenantPlanActionMode(event.target.value as "change-plan" | "renew-by-days")}
            >
              <option value="change-plan">Doi goi dich vu</option>
              <option value="renew-by-days">Gia han theo ngay</option>
            </select>
          </label>

          {tenantPlanActionMode === "change-plan" ? (
            <>
              {!canAdminActions ? (
                <p className="section-note">Billing duoc doi goi va cap nhat han su dung theo thoi gian; chi admin moi sua ngay tao.</p>
              ) : null}
              <label>
                Goi hien tai
                <input value={detailTenant.subscriptionPlan} readOnly />
              </label>
              <label>
                Goi moi
                <select
                  value={tenantPlanDraft.subscriptionPlan}
                  onChange={(event) => setTenantPlanDraft((prev) => ({ ...prev, subscriptionPlan: event.target.value }))}
                >
                  <option value="standard">standard</option>
                  <option value="pro">pro</option>
                  <option value="enterprise">enterprise</option>
                </select>
              </label>
              <label>
                Ngay tao
                <input
                  type="date"
                  value={tenantPlanDraft.createdAt}
                  disabled={!canAdminActions}
                  onChange={(event) => setTenantPlanDraft((prev) => ({ ...prev, createdAt: event.target.value }))}
                />
              </label>
              <label>
                Han su dung
                <input
                  type="date"
                  value={tenantPlanDraft.subscriptionExpiresAt}
                  min={(() => {
                    if (canAdminActions) {
                      return undefined;
                    }
                    const now = new Date();
                    const currentExpiry = detailTenant.subscriptionExpiresAt
                      ? new Date(detailTenant.subscriptionExpiresAt)
                      : null;
                    const baseline = currentExpiry && !Number.isNaN(currentExpiry.getTime()) && currentExpiry > now
                      ? currentExpiry
                      : now;
                    return toDateInputValue(baseline.toISOString());
                  })()}
                  onChange={(event) => setTenantPlanDraft((prev) => ({ ...prev, subscriptionExpiresAt: event.target.value }))}
                />
              </label>
              <label>
                Ghi chu
                <textarea
                  rows={4}
                  value={tenantPlanDraft.note}
                  onChange={(event) => setTenantPlanDraft((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Ly do doi goi, uu dai, ghi chu billing..."
                />
              </label>
            </>
          ) : (
            <>
              <label>
                So ngay gia han
                <input
                  type="number"
                  min={1}
                  max={canAdminActions ? undefined : 365}
                  value={tenantRenewDaysDraft}
                  onChange={(event) => {
                    const parsedValue = Number(event.target.value);
                    const normalizedValue = Number.isFinite(parsedValue) ? Math.max(1, Math.floor(parsedValue)) : 1;
                    setTenantRenewDaysDraft(canAdminActions ? normalizedValue : Math.min(365, normalizedValue));
                  }}
                />
              </label>
              <label>
                Han su dung hien tai
                <input value={detailTenant.displayExpiry} readOnly />
              </label>
              <label>
                Han su dung moi (tu dong)
                <input
                  value={(() => {
                    const baseDate = detailTenant.subscriptionExpiresAt ? new Date(detailTenant.subscriptionExpiresAt) : new Date();
                    const safeBaseDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
                    const nextExpiryDate = new Date(safeBaseDate);
                    nextExpiryDate.setDate(nextExpiryDate.getDate() + Math.max(1, Math.floor(tenantRenewDaysDraft)));
                    return nextExpiryDate.toLocaleDateString("vi-VN");
                  })()}
                  readOnly
                />
              </label>
              <p className="section-note">He thong tu tinh ngay het han moi theo so ngay gia han ban chon.</p>
            </>
          )}

          <div className="button-row">
            <button className="ghost-button" type="button" onClick={() => setTenantInlineActionMode("list")}>Quay lai</button>
            <button
              className="primary-button"
              type="submit"
              disabled={
                updateTenantBillingMutation.isPending
                || (tenantPlanActionMode === "change-plan" && !tenantPlanDraft.subscriptionPlan.trim())
                || (tenantPlanActionMode === "renew-by-days" && tenantRenewDaysDraft < 1)
              }
            >
              {updateTenantBillingMutation.isPending
                ? "Dang cap nhat..."
                : tenantPlanActionMode === "change-plan"
                  ? "Luu goi moi"
                  : "Gia han theo ngay"}
            </button>
          </div>
        </form>
      ) : null}

      {tenantInlineActionMode === "status" && tenantStatusTarget ? (
        <form className="form-grid" onSubmit={(event: FormEvent) => {
          event.preventDefault();
          submitTenantStatusDialog();
        }}>
          <label>
            Trang thai hien tai
            <input value={getVietnameseStatusLabel(detailTenant.status)} readOnly />
          </label>
          <label>
            Ly do xu ly
            <select
              value={tenantStatusDraft.reason}
              onChange={(event) => setTenantStatusDraft((prev) => ({ ...prev, reason: event.target.value }))}
            >
              {tenantStatusTarget === "active" ? (
                <>
                  <option value="Mo lai doanh nghiep">Mo lai doanh nghiep</option>
                  <option value="Kich hoat sau thanh toan">Kich hoat sau thanh toan</option>
                  <option value="Khoi phuc van hanh">Khoi phuc van hanh</option>
                </>
              ) : null}
              {tenantStatusTarget === "suspended" ? (
                <>
                  <option value="Tam ngung van hanh">Tam ngung van hanh</option>
                  <option value="Cho xac minh thanh toan">Cho xac minh thanh toan</option>
                  <option value="Theo yeu cau khach hang">Theo yeu cau khach hang</option>
                </>
              ) : null}
              {tenantStatusTarget === "closed" ? (
                <>
                  <option value="Dong theo yeu cau">Dong theo yeu cau</option>
                  <option value="Cham dut dich vu">Cham dut dich vu</option>
                  <option value="Thu hoi tenant">Thu hoi tenant</option>
                </>
              ) : null}
            </select>
          </label>
          <label>
            Ghi chu noi bo
            <textarea
              rows={4}
              value={tenantStatusDraft.note}
              onChange={(event) => setTenantStatusDraft((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Nhap ghi chu noi bo de luu vet thao tac..."
            />
          </label>

          {tenantStatusTarget === "closed" ? (
            <label>
              Xac nhan ma cua hang
              <input
                value={tenantStatusDraft.confirmTenantCode}
                onChange={(event) => setTenantStatusDraft((prev) => ({ ...prev, confirmTenantCode: event.target.value }))}
                placeholder={`Nhap ${detailTenant.tenantCode} de xac nhan`}
              />
            </label>
          ) : null}

          <div className={`action-drawer-callout ${tenantStatusTarget === "closed" ? "danger" : ""}`}>
            {tenantStatusTarget === "active" ? "Doanh nghiep se duoc mo lai va tiep tuc dang nhap binh thuong." : null}
            {tenantStatusTarget === "suspended" ? "Doanh nghiep se tam ngung van hanh, nhung du lieu hien tai van duoc giu nguyen." : null}
            {tenantStatusTarget === "closed" ? "Trang thai dong la thao tac nghiem trong. Nen kiem tra ky truoc khi xac nhan." : null}
          </div>

          <div className="button-row">
            <button className="ghost-button" type="button" onClick={() => setTenantInlineActionMode("list")}>Quay lai</button>
            <button
              className={tenantStatusTarget === "closed" ? "ghost-button danger-button" : "primary-button"}
              type="submit"
              disabled={
                updateTenantStatusMutation.isPending
                || (tenantStatusTarget === "closed"
                  && tenantStatusDraft.confirmTenantCode.trim().toLowerCase() !== detailTenant.tenantCode.toLowerCase())
              }
            >
              {updateTenantStatusMutation.isPending ? "Dang cap nhat..." : (
                tenantStatusTarget === "active"
                  ? "Kich hoat doanh nghiep"
                  : tenantStatusTarget === "suspended"
                    ? "Xac nhan tam ngung"
                    : "Dong doanh nghiep"
              )}
            </button>
          </div>
        </form>
      ) : null}

      {tenantInlineActionMode === "impersonate" ? (
        <div className="form-grid">
          <div className="action-drawer-callout">
            Tao phien ho tro rieng cho nhan vien CRM, ghi log tai khoan thao tac va tenant duoc truy cap.
          </div>
          <label>
            Tai khoan dang ho tro
            <input value={session?.username ?? "-"} readOnly />
          </label>
          <label>
            Tenant muc tieu
            <input value={detailTenant.tenantCode} readOnly />
          </label>
          <div className="button-row">
            <button className="ghost-button" type="button" onClick={() => setTenantInlineActionMode("list")}>Quay lai</button>
            <button className="primary-button" type="button" onClick={submitTenantUtilityDialog}>Bat phien ho tro</button>
          </div>
        </div>
      ) : null}

      {tenantInlineActionMode === "invoice" ? (
        <div className="form-grid">
          <div className="action-drawer-callout">
            Tinh huong nay can noi API billing. UI nay da tach rieng de sau nay gan xuat hoa don, gui email va luu lich su thanh toan.
          </div>
          <label>
            Doanh nghiep
            <input value={detailTenant.legalName} readOnly />
          </label>
          <label>
            Goi hien tai
            <input value={detailTenant.subscriptionPlan} readOnly />
          </label>
          <div className="button-row">
            <button className="ghost-button" type="button" onClick={() => setTenantInlineActionMode("list")}>Quay lai</button>
            <button className="primary-button" type="button" onClick={submitTenantUtilityDialog}>Mo luong billing</button>
          </div>
        </div>
      ) : null}
    </>
  ) : null;

  return (
    <div className={`page-shell admin-shell${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
      <aside className="crm-sidebar admin-sidebar">
        <div className="sidebar-identity">
          <p className="sidebar-kicker">iOrder Quan tri</p>
          <span className="role-badge">CRM PORTAL</span>
        </div>

        <nav className="sidebar-nav sidebar-nav-nested">
          <button className={`sidebar-nav-button sidebar-nav-dashboard ${activeSection === "dashboard" ? "active" : ""}`} type="button" onClick={() => goToSection("dashboard")}>
            <i className="fa-solid fa-chart-column" aria-hidden="true" /> Bang dieu khien
          </button>

          <div className="sidebar-nav-group">
            <button className={`sidebar-group-button ${openNavGroups.operations ? "open" : ""}`} type="button" onClick={() => toggleNavGroup("operations")}>
              <span><i className="fa-solid fa-sitemap" aria-hidden="true" /> Luong van hanh</span>
              <i className={`fa-solid ${openNavGroups.operations ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
            </button>
            {openNavGroups.operations ? (
              <div className="sidebar-subnav">
                <button className={`sidebar-subnav-button ${activeSection === "stores" && storeTab === "tenants" ? "active" : ""}`} type="button" onClick={() => goToSection("stores", { storeTab: "tenants" })}>
                  <i className="fa-solid fa-shop" aria-hidden="true" /> Danh sach doanh nghiep
                </button>
                <button className={`sidebar-subnav-button ${activeSection === "stores" && storeTab === "billing" ? "active" : ""}`} type="button" onClick={() => goToSection("stores", { storeTab: "billing" })}>
                  <i className="fa-solid fa-credit-card" aria-hidden="true" /> Goi va thanh toan
                </button>
                <button className={`sidebar-subnav-button ${activeSection === "customers" ? "active" : ""}`} type="button" onClick={() => goToSection("customers")}>
                  <i className="fa-solid fa-users" aria-hidden="true" /> Quan ly khach hang
                </button>
              </div>
            ) : null}
          </div>

          <div className="sidebar-nav-group">
            <button className={`sidebar-group-button ${openNavGroups.platform ? "open" : ""}`} type="button" onClick={() => toggleNavGroup("platform")}>
              <span><i className="fa-solid fa-user-shield" aria-hidden="true" /> Luong nen tang</span>
              <i className={`fa-solid ${openNavGroups.platform ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
            </button>
            {openNavGroups.platform ? (
              <div className="sidebar-subnav">
                <button className={`sidebar-subnav-button ${activeSection === "platform" && platformTab === "accounts" ? "active" : ""}`} type="button" onClick={() => goToSection("platform", { platformTab: "accounts" })}>
                  <i className="fa-solid fa-id-card" aria-hidden="true" /> Tai khoan platform
                </button>
                <button className={`sidebar-subnav-button ${activeSection === "platform" && platformTab === "roles" ? "active" : ""}`} type="button" onClick={() => goToSection("platform", { platformTab: "roles" })}>
                  <i className="fa-solid fa-key" aria-hidden="true" /> Vai tro va quyen
                </button>
                <button className={`sidebar-subnav-button ${activeSection === "notifications" && notificationTab === "system" ? "active" : ""}`} type="button" onClick={() => goToSection("notifications", { notificationTab: "system" })}>
                  <i className="fa-solid fa-bell" aria-hidden="true" /> Thong bao he thong
                </button>
                <button className={`sidebar-subnav-button ${activeSection === "notifications" && notificationTab === "tickets" ? "active" : ""}`} type="button" onClick={() => goToSection("notifications", { notificationTab: "tickets" })}>
                  <i className="fa-solid fa-headset" aria-hidden="true" /> Ticket ho tro
                </button>
              </div>
            ) : null}
          </div>

          <div className="sidebar-nav-group">
            <button className={`sidebar-group-button ${openNavGroups.governance ? "open" : ""}`} type="button" onClick={() => toggleNavGroup("governance")}>
              <span><i className="fa-solid fa-shield-halved" aria-hidden="true" /> Luong giam sat</span>
              <i className={`fa-solid ${openNavGroups.governance ? "fa-chevron-up" : "fa-chevron-down"}`} aria-hidden="true" />
            </button>
            {openNavGroups.governance ? (
              <div className="sidebar-subnav">
                <button className={`sidebar-subnav-button ${activeSection === "reports" && reportTab === "tenant" ? "active" : ""}`} type="button" onClick={() => goToSection("reports", { reportTab: "tenant" })}>
                  <i className="fa-solid fa-chart-column" aria-hidden="true" /> Bao cao tenant
                </button>
                <button className={`sidebar-subnav-button ${activeSection === "reports" && reportTab === "revenue" ? "active" : ""}`} type="button" onClick={() => goToSection("reports", { reportTab: "revenue" })}>
                  <i className="fa-solid fa-chart-line" aria-hidden="true" /> Bao cao doanh thu
                </button>
                <button className={`sidebar-subnav-button ${activeSection === "audit" && auditTab === "events" ? "active" : ""}`} type="button" onClick={() => goToSection("audit", { auditTab: "events" })}>
                  <i className="fa-solid fa-fingerprint" aria-hidden="true" /> Audit su kien
                </button>
                <button className={`sidebar-subnav-button ${activeSection === "settings" && settingsTab === "security" ? "active" : ""}`} type="button" onClick={() => goToSection("settings", { settingsTab: "security" })}>
                  <i className="fa-solid fa-user-lock" aria-hidden="true" /> Chinh sach bao mat
                </button>
              </div>
            ) : null}
          </div>
        </nav>

      </aside>

      <main className="crm-content">
        <TopBar
          showBrand={false}
          showSearch={false}
          leading={(
            <button
              className="topbar-icon-button topbar-menu-button"
              type="button"
              aria-label={sidebarCollapsed ? "Hien menu trai" : "An menu trai"}
              aria-pressed={sidebarCollapsed}
              onClick={() => setSidebarCollapsed((value) => !value)}
            >
              <i className="fa-solid fa-bars" aria-hidden="true" />
            </button>
          )}
          headerActions={(
            <button
              className="topbar-icon-button"
              type="button"
              aria-label="Mo ticket ho tro"
              onClick={() => goToSection("notifications", { notificationTab: "tickets" })}
            >
              <i className="fa-regular fa-bell" aria-hidden="true" />
              {topbarNotificationCount > 0 ? <span className="topbar-badge">{topbarNotificationCount}</span> : null}
            </button>
          )}
          userMenuItems={adminTopbarMenuItems}
        />

        {activeSection === "dashboard" ? (
          <>
            <WorkspaceHeader
              eyebrow="Tong quan"
              title="Dashboard"
              description="Tong quan he thong quan tri va tinh hinh hoat dong hien tai."
              actions={(
                <>
                  <button className="ghost-button workspace-header-button" type="button">
                    <i className="fa-regular fa-calendar" aria-hidden="true" />
                    {dashboardRangeLabel}
                  </button>
                  <button className="ghost-button workspace-header-button" type="button" onClick={() => void invalidateCoreQueries()}>
                    <i className="fa-solid fa-rotate-right" aria-hidden="true" />
                    Lam moi
                  </button>
                </>
              )}
            />

            <section className="stats-grid dashboard-stats-grid dashboard-overview-grid">
              {dashboardStats.map((item) => (
                <MetricTile
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  helper={item.helper}
                  trendLabel={item.trendLabel}
                  iconClass={item.iconClass}
                  tone={item.tone}
                  direction={item.direction}
                />
              ))}
            </section>

            <section className="crm-dashboard-grid">
              <LineChartCard
                title="Tang truong he thong"
                description="Theo doi doanh nghiep va tan suat dang nhap trong 6 ky gan nhat."
                series={dashboardPrimarySeries}
                secondarySeries={dashboardSecondarySeries}
                primaryLabel="Doanh nghiep"
                secondaryLabel="Dang nhap"
                actions={<button className="ghost-button" type="button" onClick={() => setActiveSection("reports")}>Xem bao cao</button>}
              />

              <DonutBreakdownCard
                title="Phan bo goi dich vu"
                description="Ty trong goi dang kich hoat tren toan bo he thong."
                totalLabel="Tong"
                totalValue={tenantTotalCount}
                items={dashboardPlanBreakdown}
              />

              <ActionListCard title="Thao tac nhanh" description="Di den cac luong xu ly chinh." items={dashboardQuickActions} />
            </section>

            <section className="crm-dashboard-grid crm-dashboard-grid-bottom">
              <SectionCard
                title="Can xu ly ngay"
                description="Danh sach doanh nghiep can xem xet truoc khi qua han."
                iconClass="fa-solid fa-triangle-exclamation"
                actions={<button className="ghost-button" type="button" onClick={() => goToSection("stores", { storeTab: "tenants" })}>Mo danh sach</button>}
                className="crm-dashboard-table-card"
              >
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Doanh nghiep</th>
                        <th>Goi</th>
                        <th>Het han</th>
                        <th>Xu ly</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringTenants.length > 0 ? (
                        expiringTenants.map((tenant) => (
                          <tr key={tenant.tenantId}>
                            <td>{tenant.legalName}</td>
                            <td>{tenant.subscriptionPlan}</td>
                            <td>{tenant.displayExpiry}</td>
                            <td>
                              <button className="ghost-button inline-action" type="button" onClick={() => setRenewalTenantCode(tenant.tenantCode)}>
                                Gia han
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4}>Khong co doanh nghiep can xu ly.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <FeedCard
                title="Doanh nghiep gan day"
                description="Danh sach doanh nghiep dang duoc theo doi."
                items={recentTenantItems}
                footer={<button className="ghost-button" type="button" onClick={() => goToSection("stores", { storeTab: "tenants" })}>Xem tat ca</button>}
              />

              <RankingTableCard
                title="Top doanh thu"
                description="Xep hang theo doanh thu goi dich vu uoc tinh."
                rows={topRevenueRows}
                valueLabel="Doanh thu"
                footer={<button className="ghost-button" type="button" onClick={() => setActiveSection("reports")}>Xem bao cao doanh thu</button>}
              />
            </section>

            <section className="crm-grid">
              <FeedCard
                title="Hoat dong gan day"
                description="Nhung thay doi moi nhat tren he thong."
                items={recentActivityItems}
              />

              <FeedCard
                title="Ticket ho tro"
                description="Ticket dang mo va can phan hoi."
                items={(analytics?.supportTickets ?? []).slice(0, 4).map((ticket, index) => ({
                  id: `${ticket.tenant}-${index}`,
                  title: ticket.title,
                  meta: `${ticket.tenant} - ${ticket.level}`,
                  badge: ticket.status,
                  tone: ticket.status.toLowerCase() === "open" ? ("warning" as const) : ("success" as const)
                }))}
                footer={<button className="ghost-button" type="button" onClick={() => goToSection("notifications", { notificationTab: "tickets" })}>Xem ticket</button>}
              />
            </section>

            <div className="legacy-dashboard-hidden" aria-hidden="true">
              <section className="panel">
              <div className="section-title-row">
                <div>
                  <h3><i className="fa-solid fa-chart-line" aria-hidden="true" /> Bang dieu khien</h3>
                  <p className="section-note">Tong quan he thong quan tri cua hang.</p>
                </div>
                <button className="ghost-button" type="button" onClick={() => setActiveSection("reports")}>Xem bao cao</button>
              </div>

              <div className="stats-grid dashboard-stats-grid">
                <article className="metric-card"><p>Cua hang hoat dong</p><strong>{dashboard?.activeTenants ?? tenantRows.filter((item) => item.status === "active").length}</strong></article>
                <article className="metric-card"><p>Dung thu</p><strong>{dashboard?.trialTenants ?? tenantRows.filter((item) => item.status === "trial").length}</strong></article>
                <article className="metric-card"><p>Tam ngung</p><strong>{dashboard?.suspendedTenants ?? tenantRows.filter((item) => item.status === "suspended").length}</strong></article>
                <article className="metric-card"><p>Doanh thu thang</p><strong>{formatMoney(systemRevenue)} đ</strong></article>
              </div>
            </section>

              <section className="crm-grid">
                <article className="panel">
                <div className="section-title-row">
                  <h3><i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Cua hang sap het han</h3>
                  <button className="ghost-button" type="button" onClick={() => setActiveSection("stores")}>Mo danh sach</button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Cua hang</th>
                        <th>Goi</th>
                        <th>Het han</th>
                        <th>Xu ly</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expiringTenants.map((tenant) => (
                        <tr key={tenant.tenantId}>
                          <td>{tenant.legalName}</td>
                          <td>{tenant.subscriptionPlan}</td>
                          <td>{tenant.displayExpiry}</td>
                          <td><button className="ghost-button inline-action" type="button" onClick={() => setRenewalTenantCode(tenant.tenantCode)}>Gia han</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

                <article className="panel">
                  <div className="section-title-row">
                    <h3><i className="fa-solid fa-chart-column" aria-hidden="true" /> Tang truong cua hang</h3>
                    <button className="ghost-button" type="button" onClick={() => setActiveSection("reports")}>Xem tat ca</button>
                  </div>
                  <div className="chart-card">
                    {(analytics?.tenantGrowthSeries ?? []).map((item) => (
                      <div className="chart-row" key={item.label}>
                        <span>{item.label}</span>
                        <div className="chart-track"><div className="chart-fill" style={{ width: `${item.value * 2}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </div>
          </>
        ) : null}

        {activeSection === "stores" ? (
          <div className="stores-page-layout">
            <section className="panel">
              <div className="section-title-row">
                <div>
                  <h3><i className="fa-solid fa-building" aria-hidden="true" /> Danh sach doanh nghiep</h3>
                  <p className="section-note">Bang quan ly tap trung du lieu doanh nghiep (platform.tenants).</p>
                </div>
                <button className="primary-button" type="button" onClick={() => {
                  setSelectedSchemaCode("");
                  setShowTenantDrawer(true);
                }}>+ Them moi</button>
              </div>

            </section>

            {storeTab === "tenants" ? (
              <>
                {enterprisesErrorMessage ? (
                  <section className="panel">
                    <p className="error-text">Khong tai duoc danh sach doanh nghiep: {enterprisesErrorMessage}</p>
                    <div className="button-row compact-actions">
                      <button className="ghost-button" type="button" onClick={() => void enterprisesQuery.refetch()}>
                        Thu tai du lieu
                      </button>
                    </div>
                  </section>
                ) : null}

                <div className="tenant-workspace">
                  <div className="tenant-main-pane">
                    <section className="panel">
                      <div className="filters-row compact">
                        <input className="filters-search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tim doanh nghiep..." />
                        <select value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}>
                          <option value="">Goi: Tat ca</option>
                          <option value="standard">Standard</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                          <option value="">Trang thai: Tat ca</option>
                          <option value="active">Dang dung</option>
                          <option value="trial">Thu nghiem</option>
                          <option value="suspended">Tam ngung</option>
                          <option value="closed">Da dong</option>
                        </select>
                        <select value={expiringFilter} onChange={(event) => setExpiringFilter(event.target.value)}>
                          <option value="">Sap het han: Tat ca</option>
                          <option value="7">Trong 7 ngay</option>
                          <option value="30">Trong 30 ngay</option>
                          <option value="90">Trong 90 ngay</option>
                        </select>
                      </div>
                    </section>

                    <section className="panel">
                      <div className="tenant-summary-grid">
                        <article className="tenant-summary-card">
                          <span className="tenant-summary-icon"><i className="fa-regular fa-building" aria-hidden="true" /></span>
                          <div>
                            <p>Tong doanh nghiep</p>
                            <strong>{tenantTotalCount}</strong>
                            <small>Dang hoat dong</small>
                          </div>
                        </article>
                        <article className="tenant-summary-card">
                          <span className="tenant-summary-icon active"><i className="fa-regular fa-circle-check" aria-hidden="true" /></span>
                          <div>
                            <p>Dang hoat dong</p>
                            <strong>{activeTenantCount}</strong>
                            <small>{formatTenantRatio(activeTenantCount)}</small>
                          </div>
                        </article>
                        <article className="tenant-summary-card">
                          <span className="tenant-summary-icon suspended"><i className="fa-solid fa-pause" aria-hidden="true" /></span>
                          <div>
                            <p>Tam ngung</p>
                            <strong>{suspendedTenantCount}</strong>
                            <small>{formatTenantRatio(suspendedTenantCount)}</small>
                          </div>
                        </article>
                        <article className="tenant-summary-card">
                          <span className="tenant-summary-icon trial"><i className="fa-regular fa-clock" aria-hidden="true" /></span>
                          <div>
                            <p>Thu nghiem</p>
                            <strong>{trialTenantCount}</strong>
                            <small>{formatTenantRatio(trialTenantCount)}</small>
                          </div>
                        </article>
                      </div>
                    </section>

                    <section className="panel tenant-table-panel">
                      <div className="table-wrap tenant-table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Doanh nghiep</th>
                              <th>Goi</th>
                              <th>Het han</th>
                              <th>Trang thai</th>
                              <th>Nhan vien</th>
                              <th>Cua hang con</th>
                              <th>Thao tac</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTenantRows.map((tenant, index) => {
                              const chainAccessCode = getChainAccessCode(
                                tenant.schemaName || buildTenantSchemaName(tenant.tenantCode),
                                tenant.brandName ?? tenant.tenantCode
                              );
                              return (
                                <tr key={tenant.tenantId} className="clickable-row" onClick={() => openTenantDetailModal(tenant.tenantCode)}>
                                  <td>{index + 1}</td>
                                  <td>
                                    <div className="tenant-name-cell">
                                      <strong>{tenant.legalName}</strong>
                                      <small>{tenant.schemaName || buildTenantSchemaName(tenant.tenantCode)} • {chainAccessCode}</small>
                                    </div>
                                  </td>
                                  <td>{tenant.subscriptionPlan}</td>
                                  <td>{tenant.displayExpiry}</td>
                                  <td><span className={`status-pill status-${tenant.status}`}>{getVietnameseStatusLabel(tenant.status)}</span></td>
                                  <td>{tenant.responsibleFullName || tenant.responsibleUsername || "-"}</td>
                                  <td>{tenant.storeCount}</td>
                                  <td onClick={(event) => event.stopPropagation()}>
                                    <div className="row-actions-icons">
                                      <div className="row-menu">
                                        <button
                                          className="icon-action-button row-menu-toggle"
                                          type="button"
                                          title="Danh sach chuc nang"
                                          aria-haspopup="menu"
                                          aria-expanded={activeRowMenu?.tenantCode === tenant.tenantCode}
                                          onClick={(event) => toggleRowMenu(event, tenant.tenantCode)}
                                        >
                                          <i className="fa-solid fa-ellipsis-vertical" aria-hidden="true" />
                                        </button>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {filteredTenantRows.length === 0 ? (
                              <tr>
                                <td colSpan={8}>Khong co doanh nghiep phu hop bo loc hien tai.</td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>

                  {detailTenant ? (
                    <div className="tenant-side-pane-backdrop" role="presentation" onClick={() => setDetailTenantCode(null)}>
                    <aside className="panel tenant-side-pane open fullscreen" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                      <div className="tenant-side-content">
                        <>
                            <div className="tenant-detail-header">
                              <div>
                                <h2>{detailTenant.legalName}</h2>
                                <p className="section-note">{normalizeStoreCode(detailTenant.tenantCode)} · {detailTenant.schemaName || buildTenantSchemaName(detailTenant.tenantCode)}</p>
                              </div>
                              <div className="tenant-detail-badges">
                                <span className={`status-pill status-${detailTenant.status}`}>{getVietnameseStatusLabel(detailTenant.status)}</span>
                                <span className="status-pill">{detailTenant.subscriptionPlan}</span>
                                <span className="status-pill">Het han: {detailTenant.displayExpiry}</span>
                              </div>
                              <div className="tenant-detail-toolbar">
                                <button className="ghost-button" type="button" onClick={() => setDetailTenantCode(null)}>
                                  <i className="fa-solid fa-xmark" aria-hidden="true" /> Dong
                                </button>
                              </div>
                            </div>

                            <>
                                <div className="tenant-detail-tabs">
                                  <button type="button" className={tenantDetailViewTab === "overview" ? "active" : ""} onClick={() => switchTenantDetailTab("overview")}>Tong quan</button>
                                  <button type="button" className={tenantDetailViewTab === "branches" ? "active" : ""} onClick={() => switchTenantDetailTab("branches")}>Chi nhanh</button>
                                  <button type="button" className={tenantDetailViewTab === "billing" ? "active" : ""} onClick={() => switchTenantDetailTab("billing")}>Thanh toan</button>
                                  <button type="button" className={tenantDetailViewTab === "staff" ? "active" : ""} onClick={() => switchTenantDetailTab("staff")}>Nhan su</button>
                                </div>

                                {tenantDetailViewTab === "overview" ? (
                                  <div className="tenant-overview-grid">
                                    <article className="subpanel tenant-tab-subpanel">
                                      <div className="section-title-row">
                                        <h3>Thong tin chung</h3>
                                      </div>
                                      <div className="form-grid tenant-side-form-grid">
                                        <label>Ma chuoi (Schema)<input value={detailTenant.schemaName || buildTenantSchemaName(detailTenant.tenantCode)} readOnly /></label>
                                        <label>Ma cua hang<input value={normalizeStoreCode(detailTenant.tenantCode)} readOnly /></label>
                                        <label>Ten cua hang<input value={detailTenant.legalName} readOnly /></label>
                                        <label>Nhan vien phu trach<input value={detailTenant.responsibleFullName || detailTenant.responsibleUsername || "Chua gan"} readOnly /></label>
                                      </div>
                                      {canAdminActions ? (
                                        <div className="button-row compact-actions tenant-tab-actions">
                                          <button className="ghost-button" type="button" onClick={() => openTenantEditInlinePanel(detailTenant.tenantCode)}>
                                            <i className="fa-solid fa-pen" aria-hidden="true" /> Sua thong tin
                                          </button>
                                          <button
                                            className="ghost-button"
                                            type="button"
                                            onClick={() => handleStatusAction(
                                              detailTenant.tenantCode,
                                              detailTenant.status.toLowerCase() === "active" ? "suspended" : "active"
                                            )}
                                          >
                                            <i className={`fa-solid ${detailTenant.status.toLowerCase() === "active" ? "fa-pause" : "fa-play"}`} aria-hidden="true" />
                                            {detailTenant.status.toLowerCase() === "active" ? "Tam ngung" : "Kich hoat"}
                                          </button>
                                          {detailTenant.status.toLowerCase() !== "closed" ? (
                                            <button className="ghost-button danger-button" type="button" onClick={() => handleStatusAction(detailTenant.tenantCode, "closed")}>
                                              <i className="fa-solid fa-circle-xmark" aria-hidden="true" /> Dong doanh nghiep
                                            </button>
                                          ) : null}
                                        </div>
                                      ) : null}
                                    </article>

                                    <article className="subpanel tenant-tab-subpanel">
                                      <h3>Goi & thoi han</h3>
                                      <div className="form-grid">
                                        <label>Goi dich vu<input value={detailTenant.subscriptionPlan} readOnly /></label>
                                        <label>Ngay het han<input value={detailTenant.displayExpiry} readOnly /></label>
                                      </div>
                                      <div className="tenant-branch-cards">
                                        <h3>Chi nhanh ({detailTenantStores.length || detailTenant.storeCount})</h3>
                                        {detailTenantStores.length > 0 ? detailTenantStores.map((store) => {
                                          const storeExpiryTime = store.subscriptionExpiresAt
                                            ? new Date(store.subscriptionExpiresAt).getTime()
                                            : null;
                                          const storeExpired = typeof storeExpiryTime === "number" && storeExpiryTime < Date.now();
                                          const storeDisplayExpiry = storeExpired
                                            ? "Da het han"
                                            : formatExpiryDate(store.subscriptionExpiresAt ?? detailTenant.subscriptionExpiresAt);
                                          return (
                                            <article className="tenant-branch-card" key={store.id}>
                                              <h4>{store.branchName}</h4>
                                              <p>{store.branchCode} · {store.sourceSchemaName}</p>
                                              <p>Goi: {store.subscriptionPlan ?? detailTenant.subscriptionPlan}</p>
                                              <p>Het han: {storeDisplayExpiry}</p>
                                            </article>
                                          );
                                        }) : (
                                          <p className="section-note">Chua co cua hang con.</p>
                                        )}
                                      </div>
                                    </article>

                                  </div>
                                ) : null}

                                {tenantDetailViewTab === "branches" ? (
                                  <article className="subpanel tenant-tab-subpanel">
                                    <div className="section-title-row">
                                      <h3>Chi nhanh hien co ({detailTenantStores.length || detailTenant.storeCount})</h3>
                                    </div>
                                    <div className="table-wrap">
                                      <table className="tenant-child-table">
                                        <thead>
                                          <tr>
                                            <th>Ma CN</th>
                                            <th>Ten CN</th>
                                            <th>Schema nguon</th>
                                            <th>Goi</th>
                                            <th>Het han</th>
                                            <th>Trang thai</th>
                                            <th>Nhan vien phu trach</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {detailTenantStores.length > 0 ? detailTenantStores.map((store) => {
                                            const storeExpiryTime = store.subscriptionExpiresAt
                                              ? new Date(store.subscriptionExpiresAt).getTime()
                                              : null;
                                            const storeExpired = typeof storeExpiryTime === "number" && storeExpiryTime < Date.now();
                                            const storeDisplayExpiry = storeExpired
                                              ? "Da het han"
                                              : formatExpiryDate(store.subscriptionExpiresAt ?? detailTenant.subscriptionExpiresAt);
                                            const storeStatus = store.tenantStatus ?? detailTenant.status;
                                            return (
                                              <tr key={store.id}>
                                                <td>{store.branchCode}</td>
                                                <td>{store.branchName}</td>
                                                <td>{store.sourceSchemaName}</td>
                                                <td>{store.subscriptionPlan ?? detailTenant.subscriptionPlan}</td>
                                                <td>{storeDisplayExpiry}</td>
                                                <td>{store.active ? getVietnameseStatusLabel(storeStatus) : "Ngung"}</td>
                                                <td>{store.responsibleFullName || store.responsibleUsername || detailTenant.responsibleFullName || detailTenant.responsibleUsername || "-"}</td>
                                              </tr>
                                            );
                                          }) : (
                                            <tr>
                                              <td colSpan={7}>Chua co cua hang con.</td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                    {canManageChildStores ? (
                                      <div className="button-row tenant-tab-actions">
                                        <button className="primary-button" type="button" onClick={() => openCreateStorePanel(detailTenant.tenantCode)}>
                                          <i className="fa-solid fa-plus" aria-hidden="true" /> Them chi nhanh
                                        </button>
                                      </div>
                                    ) : null}
                                  </article>
                                ) : null}

                                {tenantDetailViewTab === "billing" ? (
                                  <article className="subpanel tenant-tab-subpanel">
                                    <div className="section-title-row">
                                      <div>
                                        <h3>Thanh toan & gia han</h3>
                                        <p className="section-note">Gia han ap dung theo cap doanh nghiep. Cua hang con dung chung goi dich vu cua doanh nghiep.</p>
                                      </div>
                                    </div>
                                    <div className="form-grid tenant-side-form-grid">
                                      <label>Goi dich vu<input value={detailTenant.subscriptionPlan} readOnly /></label>
                                      <label>Ngay het han<input value={detailTenant.displayExpiry} readOnly /></label>
                                    </div>
                                    <div className="button-row compact-actions tenant-tab-actions">
                                      {(canAdminActions || canBillingActions) ? (
                                        <button className="ghost-button" type="button" onClick={() => openTenantPlanDialog(detailTenant.tenantCode)}>
                                          <i className="fa-solid fa-layer-group" aria-hidden="true" /> Doi goi
                                        </button>
                                      ) : null}
                                      {canBillingActions ? (
                                        <button className="ghost-button" type="button" onClick={() => openTenantUtilityDialog(detailTenant.tenantCode, "invoice")}>
                                          <i className="fa-solid fa-file-invoice-dollar" aria-hidden="true" /> Xuat hoa don
                                        </button>
                                      ) : null}
                                      {canAccessRenewTab ? (
                                        <button className="primary-button" type="button" onClick={() => openRenewalModal(detailTenant.tenantCode)}>
                                          <i className="fa-solid fa-calendar-plus" aria-hidden="true" /> Gia han ngay
                                        </button>
                                      ) : null}
                                    </div>
                                  </article>
                                ) : null}

                                {tenantDetailViewTab === "staff" ? (
                                  <article className="subpanel tenant-tab-subpanel">
                                    <div className="section-title-row">
                                      <h3>Nhan su phu trach</h3>
                                    </div>
                                    <div className="form-grid tenant-side-form-grid">
                                      <label>Nguoi phu trach<input value={detailTenant.responsibleFullName || detailTenant.responsibleUsername || "Chua gan"} readOnly /></label>
                                      <label>Trang thai doanh nghiep<input value={getVietnameseStatusLabel(detailTenant.status)} readOnly /></label>
                                    </div>
                                    <div className="button-row compact-actions tenant-tab-actions">
                                      {canAdminActions ? (
                                        <button className="ghost-button" type="button" onClick={() => openTenantEditInlinePanel(detailTenant.tenantCode)}>
                                          <i className="fa-solid fa-user-pen" aria-hidden="true" /> Chinh sua phu trach
                                        </button>
                                      ) : null}
                                      {canAdminActions ? (
                                        <button className="ghost-button" type="button" onClick={() => openTenantUtilityDialog(detailTenant.tenantCode, "impersonate")}>
                                          <i className="fa-solid fa-headset" aria-hidden="true" /> Dang nhap ho tro
                                        </button>
                                      ) : null}
                                    </div>
                                  </article>
                                ) : null}
                              </>
                        </>

                        {tenantPanelTab === "store" && canManageChildStores ? (
                          <form className="form-grid" onSubmit={(event: FormEvent) => {
                            event.preventDefault();
                            createStoreMutation.mutate();
                          }}>
                            <label>Ma chi nhanh *<input value={createStoreForm.branchCode} onChange={(event) => setCreateStoreForm((prev) => ({ ...prev, branchCode: event.target.value }))} placeholder="Vi du: cn1" required /></label>
                            <label>Ten chi nhanh *<input value={createStoreForm.branchName} onChange={(event) => setCreateStoreForm((prev) => ({ ...prev, branchName: event.target.value }))} placeholder="Vi du: ACafe Quan 1" required /></label>
                            <label>Schema nguon<input value={createStoreForm.sourceSchemaName} onChange={(event) => setCreateStoreForm((prev) => ({ ...prev, sourceSchemaName: event.target.value }))} placeholder="tenant_acafe" /></label>
                            <div className="button-row">
                              <button className="ghost-button" type="button" onClick={() => setTenantPanelTab("summary")}>Huy</button>
                              <button className="primary-button" type="submit" disabled={createStoreMutation.isPending}>
                                {createStoreMutation.isPending ? "Dang tao..." : "Tao chi nhanh"}
                              </button>
                            </div>
                          </form>
                        ) : null}

                        {tenantPanelTab === "renew" && canAccessRenewTab ? (
                          <div className="form-grid">
                            <label className="inline-check"><input type="radio" name="renewal-panel" checked={renewalMonths === 1} onChange={() => setRenewalMonths(1)} /> 1 thang</label>
                            <label className="inline-check"><input type="radio" name="renewal-panel" checked={renewalMonths === 3} onChange={() => setRenewalMonths(3)} /> 3 thang</label>
                            <label className="inline-check"><input type="radio" name="renewal-panel" checked={renewalMonths === 12} onChange={() => setRenewalMonths(12)} /> 12 thang</label>
                            <p className="section-note">Het han moi: {renewalPreviewDate.toLocaleDateString("vi-VN")}</p>

                            {!canDirectRenew ? (
                              <label>
                                Ma gia han
                                <input value={renewalKeyInput} onChange={(event) => setRenewalKeyInput(event.target.value)} placeholder="Nhap renewal key" />
                              </label>
                            ) : null}

                            {canCreateRenewalKey ? (
                              <div className="button-row compact-actions">
                                <button className="ghost-button" type="button" onClick={() => createRenewalKeyMutation.mutate()} disabled={createRenewalKeyMutation.isPending}>
                                  {createRenewalKeyMutation.isPending ? "Dang tao ma..." : "Tao Renewal Key"}
                                </button>
                                {generatedRenewalKey ? <span className="status-pill">Ma: {generatedRenewalKey}</span> : null}
                              </div>
                            ) : null}

                            <label>
                              Ghi chu
                              <input value={renewalNote} onChange={(event) => setRenewalNote(event.target.value)} placeholder="Ghi chu gia han" />
                            </label>

                            <div className="button-row">
                              <button className="ghost-button" type="button" onClick={() => setTenantPanelTab("summary")}>Huy</button>
                              <button
                                className="primary-button"
                                type="button"
                                onClick={() => renewTenantMutation.mutate()}
                                disabled={
                                  renewTenantMutation.isPending
                                  || (!canDirectRenew && !renewalKeyInput.trim())
                                }
                              >
                                {renewTenantMutation.isPending ? "Dang gia han..." : "Xac nhan gia han"}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </aside>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <section className="crm-grid">
                  {billingPlans.map((plan) => (
                    <article className="panel" key={plan.name}>
                      <h3>{plan.name}</h3>
                      <p className="section-note">{formatMoney(plan.price)} đ / thang</p>
                      <div className="plan-meta">
                        <span>Chi nhanh: {plan.branches}</span>
                        <span>Tai khoan: {plan.accounts}</span>
                      </div>
                      <ul className="feature-list">
                        {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                      </ul>
                    </article>
                  ))}
                </section>

                <section className="panel">
                  <div className="stats-grid dashboard-stats-grid">
                    <article className="metric-card"><p>MRR</p><strong>{formatMoney(systemRevenue)} đ</strong></article>
                    <article className="metric-card"><p>ARR</p><strong>{formatMoney(systemRevenue * 12)} đ</strong></article>
                    <article className="metric-card"><p>Cua hang goi Pro</p><strong>{tenantRows.filter((item) => item.subscriptionPlan.toLowerCase() === "pro").length}</strong></article>
                  </div>
                </section>
              </>
            )}
          </div>
        ) : null}

        {activeSection === "customers" ? (
          <section className="panel customer-page-panel">
            <div className="section-title-row">
              <div>
                <h3><i className="fa-solid fa-user-tie" aria-hidden="true" /> Khach hang</h3>
                <p className="section-note">Chu cua hang va tai khoan gan voi tung cua hang.</p>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tai khoan</th>
                    <th>Cua hang</th>
                    <th>Email</th>
                    <th>Lan dang nhap</th>
                    <th>Trang thai</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantOwnerAccounts.length > 0 ? tenantOwnerAccounts.map((account) => (
                    <tr key={account.id}>
                      <td>{account.username}</td>
                      <td>{account.tenantCode}</td>
                      <td>{account.email}</td>
                      <td>{account.lastLogin}</td>
                      <td><span className="status-pill">{getVietnameseStatusLabel(account.status)}</span></td>
                    </tr>
                  )) : <tr><td colSpan={5}>Chua co tai khoan khach hang.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeSection === "platform" ? (
          <>
            <section className="panel">
              <div className="section-title-row">
                <div>
                  <h3><i className="fa-solid fa-users-gear" aria-hidden="true" /> Quan tri he thong</h3>
                  <p className="section-note">Tai khoan quan tri, vai tro va quyen.</p>
                </div>
                <div className="button-row">
                  <button className="ghost-button" type="button" onClick={() => setShowRoleDrawer(true)}>+ Tao vai tro</button>
                  <button className="primary-button" type="button" onClick={() => setShowPlatformDrawer(true)}>+ Tao quan tri vien</button>
                </div>
              </div>
              <div className="detail-tabs">
                <button type="button" className={platformTab === "accounts" ? "active" : ""} onClick={() => setPlatformTab("accounts")}>Tai khoan</button>
                <button type="button" className={platformTab === "roles" ? "active" : ""} onClick={() => setPlatformTab("roles")}>Vai tro va quyen</button>
              </div>
            </section>

            {platformTab === "accounts" ? (
              <>
                <section className="panel">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Tai khoan</th>
                          <th>Vai tro quan tri</th>
                          <th>Trang thai</th>
                          <th>So cua hang</th>
                          <th>Xu ly</th>
                        </tr>
                      </thead>
                      <tbody>
                        {platformAccounts.map((account) => (
                          <tr key={account.id} className={`clickable-row ${selectedEmployeeId === account.id ? "selected-row" : ""}`} onClick={() => setSelectedEmployeeId(account.id)}>
                            <td>{account.username}</td>
                            <td>{account.platformRoles.join(", ") || "-"}</td>
                            <td><span className="status-pill">{getVietnameseStatusLabel(account.status)}</span></td>
                            <td>{account.tenantAccesses.length}</td>
                            <td>
                              <button
                                className="ghost-button inline-action"
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Vo hieu tai khoan ${account.username}?`)) {
                                    disableEmployeeMutation.mutate(account.id);
                                  }
                                }}
                              >
                                Vo hieu
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="crm-grid">
                  <article className="panel">
                    <h3>Cap nhat tai khoan</h3>
                    <div className="form-grid">
                      <label>
                        Chon tai khoan
                        <select value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.target.value)}>
                          <option value="">-- Chon tai khoan --</option>
                          {platformAccounts.map((account) => <option key={account.id} value={account.id}>{account.username}</option>)}
                        </select>
                      </label>
                      <label>Ho ten<input value={updateEmployeeForm.fullName} onChange={(event) => setUpdateEmployeeForm((prev) => ({ ...prev, fullName: event.target.value }))} /></label>
                      <label>Email<input value={updateEmployeeForm.email} onChange={(event) => setUpdateEmployeeForm((prev) => ({ ...prev, email: event.target.value }))} /></label>
                      <label>So dien thoai<input value={updateEmployeeForm.phone} onChange={(event) => setUpdateEmployeeForm((prev) => ({ ...prev, phone: event.target.value }))} /></label>
                      <label>
                        Trang thai
                        <select value={updateEmployeeForm.status} onChange={(event) => setUpdateEmployeeForm((prev) => ({ ...prev, status: event.target.value }))}>
                          <option value="active">Hoat dong</option>
                          <option value="pending">Cho kich hoat</option>
                          <option value="locked">Bi khoa</option>
                          <option value="disabled">Vo hieu</option>
                        </select>
                      </label>
                      <label className="inline-check"><input type="checkbox" checked={updateEmployeeForm.platformAdmin} onChange={(event) => setUpdateEmployeeForm((prev) => ({ ...prev, platformAdmin: event.target.checked }))} /> Quan tri he thong</label>
                      <button className="primary-button" type="button" onClick={() => updateEmployeeMutation.mutate()} disabled={!selectedEmployeeId || updateEmployeeMutation.isPending}>
                        {updateEmployeeMutation.isPending ? "Dang luu..." : "Luu tai khoan"}
                      </button>
                    </div>

                    <div className="form-grid compact-form-grid">
                      <h3>Dat lai mat khau</h3>
                      <label>Mat khau moi<input type="password" value={resetPasswordValue} onChange={(event) => setResetPasswordValue(event.target.value)} placeholder="It nhat 8 ky tu" /></label>
                      <button className="ghost-button" type="button" onClick={() => updateEmployeePasswordMutation.mutate()} disabled={!selectedEmployeeId || !resetPasswordValue.trim() || updateEmployeePasswordMutation.isPending}>
                        {updateEmployeePasswordMutation.isPending ? "Dang cap nhat..." : "Cap nhat mat khau"}
                      </button>
                    </div>
                  </article>

                  <article className="panel">
                    <h3>Phan quyen theo pham vi</h3>
                    <div className="form-grid">
                      <label>Vai tro quan tri (CSV)<input value={employeeRoleInput} onChange={(event) => setEmployeeRoleInput(event.target.value)} placeholder="PLATFORM_ADMIN, PLATFORM_SUPPORT" /></label>
                      <button className="ghost-button" type="button" onClick={() => updatePlatformRolesMutation.mutate()} disabled={!selectedEmployeeId || updatePlatformRolesMutation.isPending}>
                        {updatePlatformRolesMutation.isPending ? "Dang luu..." : "Cap nhat vai tro quan tri"}
                      </button>
                    </div>

                    <div className="form-grid compact-form-grid">
                      <label>
                        Cua hang
                        <select value={selectedTenantCode} onChange={(event) => setSelectedTenantCode(event.target.value)}>
                          {tenantRows.map((tenant) => <option key={tenant.tenantCode} value={tenant.tenantCode}>{tenant.tenantCode}</option>)}
                        </select>
                      </label>
                      <label>
                        Muc truy cap
                        <select value={tenantAccessLevel} onChange={(event) => setTenantAccessLevel(event.target.value)}>
                          <option value="owner">Chu cua hang</option>
                          <option value="admin">Quan tri cua hang</option>
                          <option value="manager">Quan ly</option>
                          <option value="cashier">Thu ngan</option>
                          <option value="inventory">Kho</option>
                          <option value="auditor">Kiem soat</option>
                          <option value="api">API</option>
                          <option value="staff">Nhan vien</option>
                        </select>
                      </label>
                      <label>
                        Trang thai truy cap
                        <select value={tenantAccessStatus} onChange={(event) => setTenantAccessStatus(event.target.value)}>
                          <option value="active">Hoat dong</option>
                          <option value="disabled">Vo hieu</option>
                        </select>
                      </label>
                      <label>Vai tro cua hang (CSV)<input value={tenantRoleInput} onChange={(event) => setTenantRoleInput(event.target.value)} placeholder="TENANT_OWNER, STORE_MANAGER" /></label>
                      <div className="button-row">
                        <button className="ghost-button" type="button" onClick={() => upsertTenantAccessMutation.mutate()} disabled={!selectedEmployeeId || !selectedTenantCode || upsertTenantAccessMutation.isPending}>
                          {upsertTenantAccessMutation.isPending ? "Dang luu..." : "Luu quyen cua hang"}
                        </button>
                        <button className="ghost-button" type="button" onClick={() => removeTenantAccessMutation.mutate()} disabled={!selectedEmployeeId || !selectedTenantCode || removeTenantAccessMutation.isPending}>
                          {removeTenantAccessMutation.isPending ? "Dang xoa..." : "Xoa quyen cua hang"}
                        </button>
                      </div>
                    </div>
                    {selectedEmployee ? <p className="section-note">Dang cap quyen cho <strong>{selectedEmployee.username}</strong>.</p> : null}
                  </article>
                </section>
              </>
            ) : (
              <>
                <section className="panel">
                  <div className="form-grid">
                    <label>
                      Chon vai tro
                      <select value={selectedRoleKey} onChange={(event) => setSelectedRoleKey(event.target.value)}>
                        <option value="">-- Chon vai tro --</option>
                        {platformRoleSummaries.map((role) => <option key={role.roleKey} value={role.roleKey}>{role.roleKey}</option>)}
                      </select>
                    </label>
                    <label>Danh sach quyen (CSV)<input value={rolePermissionInput} onChange={(event) => setRolePermissionInput(event.target.value)} placeholder="platform.account.update, platform.role.assign" /></label>
                    <div className="button-row">
                      <button className="ghost-button" type="button" onClick={() => updateRolePermissionsMutation.mutate()} disabled={!selectedRoleKey || updateRolePermissionsMutation.isPending}>
                        {updateRolePermissionsMutation.isPending ? "Dang luu..." : "Cap nhat quyen"}
                      </button>
                      <button className="ghost-button" type="button" onClick={() => {
                        if (selectedRoleKey && window.confirm(`Xoa vai tro ${selectedRoleKey}?`)) {
                          deleteRoleMutation.mutate();
                        }
                      }} disabled={!selectedRoleKey || deleteRoleMutation.isPending}>
                        {deleteRoleMutation.isPending ? "Dang xoa..." : "Xoa vai tro"}
                      </button>
                    </div>
                  </div>
                  {selectedRole ? <p className="section-note">{selectedRole.roleName} · {getRoleScopeLabel(selectedRole.roleScope)}</p> : null}
                </section>

                <section className="panel">
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Ma vai tro</th>
                          <th>Ten vai tro</th>
                          <th>Pham vi</th>
                          <th>So quyen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {platformRoleSummaries.map((role) => (
                          <tr key={role.roleKey} className={`clickable-row ${selectedRoleKey === role.roleKey ? "selected-row" : ""}`} onClick={() => setSelectedRoleKey(role.roleKey)}>
                            <td>{role.roleKey}</td>
                            <td>{role.roleName}</td>
                            <td>{getRoleScopeLabel(role.roleScope)}</td>
                            <td>{role.permissionKeys.length}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </>
        ) : null}

        {activeSection === "notifications" ? (
          <>
            <section className="panel">
              <div className="section-title-row">
                <div>
                  <h3><i className="fa-solid fa-bell" aria-hidden="true" /> Thong bao va ho tro</h3>
                  <p className="section-note">Thong bao he thong, yeu cau ho tro va gui hang loat.</p>
                </div>
              </div>
              <div className="detail-tabs">
                <button type="button" className={notificationTab === "system" ? "active" : ""} onClick={() => setNotificationTab("system")}>Thong bao he thong</button>
                <button type="button" className={notificationTab === "tickets" ? "active" : ""} onClick={() => setNotificationTab("tickets")}>Yeu cau ho tro</button>
                <button type="button" className={notificationTab === "broadcast" ? "active" : ""} onClick={() => setNotificationTab("broadcast")}>Gui thong bao</button>
              </div>
            </section>

            {notificationTab === "system" ? (
              <section className="panel">
                <ul className="activity-list compact">
                  {(analytics?.notifications ?? []).map((item) => (
                    <li key={item.title}>
                      <strong>{item.title}</strong>
                      <span>{item.target} · {item.time}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {notificationTab === "tickets" ? (
              <section className="panel">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Cua hang</th>
                        <th>Tieu de</th>
                        <th>Muc do</th>
                        <th>Trang thai</th>
                        <th>Xu ly</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analytics?.supportTickets ?? []).map((ticket, index) => (
                        <tr key={`${ticket.tenant}-${ticket.title}`}>
                          <td>{ticket.tenant}</td>
                          <td>{ticket.title}</td>
                          <td>{ticket.level}</td>
                          <td>{ticket.status}</td>
                          <td><button className="ghost-button inline-action" type="button" onClick={() => setSelectedTicketIndex(index)}>Mo</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            {notificationTab === "broadcast" ? (
              <section className="panel">
                <div className="form-grid">
                  <label>Doi tuong<select><option>Tat ca</option><option>Standard</option><option>Pro</option><option>Chon cua hang</option></select></label>
                  <label>Noi dung<textarea rows={6} className="text-area" placeholder="Soan thong bao..." /></label>
                  <div className="button-row">
                    <button className="ghost-button" type="button">Xem truoc</button>
                    <button className="ghost-button" type="button">Gui ngay</button>
                    <button className="primary-button" type="button">Hen gio</button>
                  </div>
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {activeSection === "reports" ? (
          <>
            <section className="panel">
              <div className="section-title-row">
                <div>
                  <h3><i className="fa-solid fa-chart-line" aria-hidden="true" /> Bao cao he thong</h3>
                  <p className="section-note">Cua hang, doanh thu, tang truong va muc su dung he thong.</p>
                </div>
              </div>
              <div className="detail-tabs report-tabs-row">
                <button type="button" className={reportTab === "tenant" ? "active" : ""} onClick={() => setReportTab("tenant")}>Cua hang</button>
                <button type="button" className={reportTab === "revenue" ? "active" : ""} onClick={() => setReportTab("revenue")}>Doanh thu</button>
                <button type="button" className={reportTab === "growth" ? "active" : ""} onClick={() => setReportTab("growth")}>Tang truong</button>
                <button type="button" className={reportTab === "usage" ? "active" : ""} onClick={() => setReportTab("usage")}>Su dung</button>
              </div>
            </section>

            {reportTab === "tenant" ? (
              <section className="crm-grid">
                <article className="panel">
                  <h3>Bieu do cua hang moi theo thang</h3>
                  <div className="chart-card">
                    {(analytics?.tenantGrowthSeries ?? []).map((item) => (
                      <div className="chart-row" key={item.label}>
                        <span>{item.label}</span>
                        <div className="chart-track"><div className="chart-fill" style={{ width: `${item.value * 2}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="panel">
                  <h3>Phan bo theo goi</h3>
                  <div className="stats-grid mini-stats-grid">
                    <article className="metric-card"><p>Standard</p><strong>{tenantRows.filter((item) => item.subscriptionPlan.toLowerCase() === "standard").length}</strong></article>
                    <article className="metric-card"><p>Pro</p><strong>{tenantRows.filter((item) => item.subscriptionPlan.toLowerCase() === "pro").length}</strong></article>
                    <article className="metric-card"><p>Enterprise</p><strong>{tenantRows.filter((item) => item.subscriptionPlan.toLowerCase() === "enterprise").length}</strong></article>
                  </div>
                </article>
              </section>
            ) : null}

            {reportTab === "revenue" ? (
              <section className="panel">
                <div className="stats-grid dashboard-stats-grid">
                  <article className="metric-card"><p>MRR</p><strong>{formatMoney(systemRevenue)} đ</strong></article>
                  <article className="metric-card"><p>ARR</p><strong>{formatMoney(systemRevenue * 12)} đ</strong></article>
                  <article className="metric-card"><p>Churn</p><strong>3.2%</strong></article>
                </div>
              </section>
            ) : null}

            {reportTab === "growth" ? (
              <section className="panel">
                <div className="stats-grid dashboard-stats-grid">
                  <article className="metric-card"><p>Cua hang moi</p><strong>+24%</strong></article>
                  <article className="metric-card"><p>Doanh thu</p><strong>+18%</strong></article>
                  <article className="metric-card"><p>ARPU</p><strong>+12%</strong></article>
                </div>
              </section>
            ) : null}

            {reportTab === "usage" ? (
              <section className="panel">
                <h3>Muc su dung he thong</h3>
                <div className="chart-card">
                  {(analytics?.loginUsageSeries ?? []).map((item) => (
                    <div className="chart-row" key={item.label}>
                      <span>{item.label}</span>
                      <div className="chart-track"><div className="chart-fill" style={{ width: `${item.value * 2}%` }} /></div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {activeSection === "audit" ? (
          <>
            <section className="panel">
              <div className="section-title-row">
                <div>
                  <h3><i className="fa-solid fa-shield-halved" aria-hidden="true" /> Audit va bao mat</h3>
                  <p className="section-note">Loc theo su kien, cua hang, quan tri vien va thoi gian.</p>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Thoi gian</th>
                      <th>Quan tri</th>
                      <th>Hanh dong</th>
                      <th>Doi tuong</th>
                      <th>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics?.auditEvents ?? []).map((event) => (
                      <tr key={`${event.time}-${event.action}`}>
                        <td>{event.time}</td>
                        <td>{event.admin}</td>
                        <td>{event.action}</td>
                        <td>{event.object}</td>
                        <td>{event.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel">
              <div className="section-title-row">
                <h3>Phien dang ngo</h3>
                <div className="detail-tabs">
                  <button type="button" className={auditTab === "events" ? "active" : ""} onClick={() => setAuditTab("events")}>Su kien</button>
                  <button type="button" className={auditTab === "suspicious" ? "active" : ""} onClick={() => setAuditTab("suspicious")}>Phien dang nhap</button>
                </div>
              </div>
              <div className="crm-grid">
                {(analytics?.suspiciousSessions ?? []).map((sessionRow) => (
                  <article className="subpanel" key={`${sessionRow.user}-${sessionRow.ip}`}>
                    <h3>{sessionRow.user}</h3>
                    <p>{sessionRow.ip}</p>
                    <p>{sessionRow.note}</p>
                    <div className="button-row">
                      <button className="ghost-button" type="button">Buoc dang xuat</button>
                      <button className="ghost-button" type="button">Khoa tai khoan</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}

        {activeSection === "settings" ? (
          <>
            <section className="panel">
              <div className="section-title-row">
                <div>
                  <h3><i className="fa-solid fa-gear" aria-hidden="true" /> Cai dat he thong</h3>
                  <p className="section-note">Thong tin he thong, SMTP, tich hop va bao mat.</p>
                </div>
              </div>
              <div className="detail-tabs settings-tabs-row">
                <button type="button" className={settingsTab === "platform" ? "active" : ""} onClick={() => setSettingsTab("platform")}>Thong tin he thong</button>
                <button type="button" className={settingsTab === "smtp" ? "active" : ""} onClick={() => setSettingsTab("smtp")}>Email / SMTP</button>
                <button type="button" className={settingsTab === "integrations" ? "active" : ""} onClick={() => setSettingsTab("integrations")}>Tich hop</button>
                <button type="button" className={settingsTab === "security" ? "active" : ""} onClick={() => setSettingsTab("security")}>Bao mat</button>
              </div>
            </section>

            {settingsTab === "platform" ? (
              <section className="panel">
                <div className="form-grid">
                  <label>Ten phan mem<input defaultValue="iOrder Quan tri" /></label>
                  <label>Domain<input defaultValue="admin.iorder.vn" /></label>
                  <label>Lien he ho tro<input defaultValue="support@iorder.vn" /></label>
                </div>
              </section>
            ) : null}

            {settingsTab === "smtp" ? (
              <section className="panel">
                <div className="form-grid">
                  <label>SMTP host<input defaultValue="smtp.iorder.vn" /></label>
                  <label>SMTP port<input defaultValue="587" /></label>
                  <label>Tai khoan gui<input defaultValue="noreply@iorder.vn" /></label>
                </div>
              </section>
            ) : null}

            {settingsTab === "integrations" ? (
              <section className="panel">
                <div className="stats-grid mini-stats-grid">
                  <article className="metric-card"><p>Thanh toan</p><strong>VNPay / Momo / ZaloPay</strong></article>
                  <article className="metric-card"><p>Thong bao</p><strong>Zalo OA / SMS</strong></article>
                  <article className="metric-card"><p>Webhook</p><strong>Dang bat</strong></article>
                </div>
              </section>
            ) : null}

            {settingsTab === "security" ? (
              <section className="panel">
                <div className="form-grid">
                  <label>Do phuc tap mat khau<select><option>Trung binh</option><option>Cao</option></select></label>
                  <label>Session timeout<input defaultValue="30 phut" /></label>
                  <label className="inline-check"><input type="checkbox" defaultChecked /> Bat buoc MFA cho PLATFORM_ADMIN</label>
                  <label>Whitelist IP<input defaultValue="1.2.3.4, 5.6.7.8" /></label>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </main>

      {showProfileDrawer ? (
        <div className="drawer-backdrop" role="presentation" onClick={() => setShowProfileDrawer(false)}>
          <aside className="drawer-panel modal-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="section-title-row">
              <div>
                <h3>Thong tin ca nhan</h3>
                <p className="section-note">Cap nhat ten hien thi, email va so dien thoai cua tai khoan dang dang nhap.</p>
              </div>
              <button className="ghost-button" type="button" onClick={() => setShowProfileDrawer(false)}>Dong</button>
            </div>

            <form
              className="form-grid"
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                updateCurrentUserProfileMutation.mutate();
              }}
            >
              <label>
                Ten hien thi
                <input
                  value={profileForm.fullName}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  required
                />
              </label>
              <label>
                Email
                <input
                  value={profileForm.email}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </label>
              <label>
                So dien thoai
                <input
                  value={profileForm.phone}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </label>
              <div className="button-row">
                <button className="ghost-button" type="button" onClick={() => setShowProfileDrawer(false)}>Huy</button>
                <button className="primary-button" type="submit" disabled={!currentUserAccount || updateCurrentUserProfileMutation.isPending}>
                  {updateCurrentUserProfileMutation.isPending ? "Dang luu..." : "Luu thong tin"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {showPasswordDrawer ? (
        <div className="drawer-backdrop" role="presentation" onClick={() => setShowPasswordDrawer(false)}>
          <aside className="drawer-panel modal-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="section-title-row">
              <div>
                <h3>Doi mat khau</h3>
                <p className="section-note">Nhap mat khau moi cho tai khoan dang dang nhap.</p>
              </div>
              <button className="ghost-button" type="button" onClick={() => setShowPasswordDrawer(false)}>Dong</button>
            </div>

            <div className="form-grid">
              <label>
                Mat khau moi
                <input
                  type="password"
                  value={selfPasswordValue}
                  onChange={(event) => setSelfPasswordValue(event.target.value)}
                  placeholder="It nhat 8 ky tu"
                />
              </label>
              <div className="button-row">
                <button className="ghost-button" type="button" onClick={() => setShowPasswordDrawer(false)}>Huy</button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => updateCurrentUserPasswordMutation.mutate()}
                  disabled={!currentUserAccount || !selfPasswordValue.trim() || updateCurrentUserPasswordMutation.isPending}
                >
                  {updateCurrentUserPasswordMutation.isPending ? "Dang cap nhat..." : "Doi mat khau"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {detailTenant && tenantInlineActionMode !== "list" ? (
        <div className="drawer-backdrop" role="presentation" onClick={() => setTenantInlineActionMode("list")}>
          <aside className="drawer-panel modal-panel tenant-action-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="section-title-row">
              <div>
                <h3>{activeTenantActionTitle}</h3>
                <p className="section-note">Popup rieng cho tung chuc nang de de kiem soat thao tac.</p>
              </div>
              <button className="ghost-button" type="button" onClick={() => setTenantInlineActionMode("list")}>Dong</button>
            </div>
            {tenantActionWorkspaceContent}
          </aside>
        </div>
      ) : null}

      {activeRowMenu ? (
        <div
          className="row-menu-panel floating-row-menu"
          role="menu"
          style={{ top: activeRowMenu.top, left: activeRowMenu.left }}
        >
          {getTenantActions(activeRowMenu.tenantCode).map((action) => (
            <button
              key={`${activeRowMenu.tenantCode}-${action.key}`}
              type="button"
              className={action.danger ? "danger-action" : ""}
              onClick={() => {
                setActiveRowMenu(null);
                action.onClick();
              }}
            >
              <i className={action.icon} aria-hidden="true" />
              {action.label}
            </button>
          ))}
        </div>
      ) : null}

      {showTenantDrawer ? (
        <div className="drawer-backdrop" role="presentation" onClick={() => setShowTenantDrawer(false)}>
          <aside className="drawer-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="section-title-row">
              <div>
                <h3>{selectedSchemaCode ? `Cap nhat doanh nghiep ${normalizeStoreCode(selectedSchemaCode)}` : "Tao doanh nghiep moi"}</h3>
                <p className="section-note">Quan ly thong tin doanh nghiep, ma chuoi Admin Store va goi dich vu.</p>
              </div>
              <button className="ghost-button" type="button" onClick={() => setShowTenantDrawer(false)}>Dong</button>
            </div>

            {selectedSchemaCode ? (
              <form className="form-grid" onSubmit={(event: FormEvent) => {
                event.preventDefault();
                updateTenantSchemaMutation.mutate();
              }}>
                <label>Ma cua hang<input value={normalizeStoreCode(selectedSchemaCode)} readOnly /></label>
                <label>Ma chuoi (ID Admin Store)<input value={getChainAccessCode(editingTenantSummary?.schemaName ?? "", selectedSchemaCode)} readOnly /></label>
                <p className="section-note">Schema noi bo: {editingTenantSummary?.schemaName || buildTenantSchemaName(selectedSchemaCode)}</p>
                <label>Ten phap nhan *<input value={updateTenantSchemaForm.legalName} onChange={(event) => setUpdateTenantSchemaForm((prev) => ({ ...prev, legalName: event.target.value }))} required /></label>
                <label>Ten thuong hieu<input value={updateTenantSchemaForm.brandName} onChange={(event) => setUpdateTenantSchemaForm((prev) => ({ ...prev, brandName: event.target.value }))} /></label>
                <label>
                  Goi dich vu
                  <select value={updateTenantSchemaForm.subscriptionPlan} onChange={(event) => setUpdateTenantSchemaForm((prev) => ({ ...prev, subscriptionPlan: event.target.value }))}>
                    <option value="standard">standard</option>
                    <option value="pro">pro</option>
                    <option value="enterprise">enterprise</option>
                  </select>
                </label>
                <label>
                  Trang thai
                  <select value={updateTenantSchemaForm.status} onChange={(event) => setUpdateTenantSchemaForm((prev) => ({ ...prev, status: event.target.value }))}>
                    <option value="trial">Thu nghiem</option>
                    <option value="active">Dang dung</option>
                    <option value="suspended">Tam ngung</option>
                    <option value="closed">Da dong</option>
                  </select>
                </label>
                <label>
                  Nguoi phu trach
                  <select value={updateTenantSchemaForm.responsibleAccountId} onChange={(event) => setUpdateTenantSchemaForm((prev) => ({ ...prev, responsibleAccountId: event.target.value }))}>
                    <option value="">-- Chua gan --</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.username}</option>)}
                  </select>
                </label>
                <div className="button-row">
                  <button className="ghost-button" type="button" onClick={() => setShowTenantDrawer(false)}>Huy</button>
                  <button className="primary-button" type="submit" disabled={updateTenantSchemaMutation.isPending}>{updateTenantSchemaMutation.isPending ? "Dang luu..." : "Luu doanh nghiep"}</button>
                </div>
              </form>
            ) : (
              <form className="form-grid" onSubmit={(event: FormEvent) => {
                event.preventDefault();
                createTenantSchemaMutation.mutate();
              }}>
                <label>Ma cua hang (khong dung tien to tenant_)<input value={createTenantSchemaForm.tenantCode} onChange={(event) => setCreateTenantSchemaForm((prev) => ({ ...prev, tenantCode: normalizeStoreCode(event.target.value) }))} placeholder="Vi du: acafe" /></label>
                <label>Ma chuoi (ID Admin Store)<input value={normalizeStoreCode(createTenantSchemaForm.tenantCode)} readOnly placeholder="acafe" /></label>
                <p className="section-note">Schema noi bo tu dong: {createTenantSchemaForm.schemaName || "tenant_<ma_cua_hang>"}</p>
                <label>Ten phap nhan *<input value={createTenantSchemaForm.legalName} onChange={(event) => setCreateTenantSchemaForm((prev) => ({ ...prev, legalName: event.target.value }))} required /></label>
                <label>Ten thuong hieu<input value={createTenantSchemaForm.brandName} onChange={(event) => setCreateTenantSchemaForm((prev) => ({ ...prev, brandName: event.target.value }))} /></label>
                <label>
                  Goi dich vu
                  <select value={createTenantSchemaForm.subscriptionPlan} onChange={(event) => setCreateTenantSchemaForm((prev) => ({ ...prev, subscriptionPlan: event.target.value }))}>
                    <option value="standard">standard</option>
                    <option value="pro">pro</option>
                    <option value="enterprise">enterprise</option>
                  </select>
                </label>
                <label>
                  Trang thai
                  <select value={createTenantSchemaForm.status} onChange={(event) => setCreateTenantSchemaForm((prev) => ({ ...prev, status: event.target.value }))}>
                    <option value="trial">Thu nghiem</option>
                    <option value="active">Dang dung</option>
                    <option value="suspended">Tam ngung</option>
                    <option value="closed">Da dong</option>
                  </select>
                </label>
                <label>
                  Nguoi phu trach
                  <select value={createTenantSchemaForm.responsibleAccountId} onChange={(event) => setCreateTenantSchemaForm((prev) => ({ ...prev, responsibleAccountId: event.target.value }))}>
                    <option value="">-- Chua gan --</option>
                    {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.username}</option>)}
                  </select>
                </label>
                <div className="button-row">
                  <button className="ghost-button" type="button" onClick={() => setShowTenantDrawer(false)}>Huy</button>
                  <button className="primary-button" type="submit" disabled={createTenantSchemaMutation.isPending}>{createTenantSchemaMutation.isPending ? "Dang xu ly..." : "Tao doanh nghiep"}</button>
                </div>
              </form>
            )}
          </aside>
        </div>
      ) : null}

      {showPlatformDrawer ? (
        <div className="drawer-backdrop" role="presentation" onClick={() => setShowPlatformDrawer(false)}>
          <aside className="drawer-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="section-title-row">
              <div>
                <h3>+ Tao tai khoan quan tri</h3>
                <p className="section-note">Tai khoan quan tri he thong hoac ho tro he thong.</p>
              </div>
              <button className="ghost-button" type="button" onClick={() => setShowPlatformDrawer(false)}>Dong</button>
            </div>

            <form className="form-grid" onSubmit={(event: FormEvent) => {
              event.preventDefault();
              createPlatformAdminMutation.mutate();
            }}>
              <label>Ho ten<input value={createPlatformAdminForm.fullName} onChange={(event) => setCreatePlatformAdminForm((prev) => ({ ...prev, fullName: event.target.value }))} /></label>
              <label>Username<input value={createPlatformAdminForm.username} onChange={(event) => setCreatePlatformAdminForm((prev) => ({ ...prev, username: event.target.value }))} /></label>
              <label>Email<input value={createPlatformAdminForm.email} onChange={(event) => setCreatePlatformAdminForm((prev) => ({ ...prev, email: event.target.value }))} /></label>
              <label>So dien thoai<input value={createPlatformAdminForm.phone} onChange={(event) => setCreatePlatformAdminForm((prev) => ({ ...prev, phone: event.target.value }))} /></label>
              <label>
                Vai tro
                <select value={createPlatformAdminForm.role} onChange={(event) => setCreatePlatformAdminForm((prev) => ({ ...prev, role: event.target.value }))}>
                  {platformRoleSummaries.length > 0 ? platformRoleSummaries.map((role) => (
                    <option key={role.roleKey} value={role.roleKey}>{role.roleKey}</option>
                  )) : <option value="PLATFORM_ADMIN">PLATFORM_ADMIN</option>}
                </select>
              </label>
              <label>
                Cua hang duoc gan
                <select value={createPlatformAdminForm.tenantCode} onChange={(event) => setCreatePlatformAdminForm((prev) => ({ ...prev, tenantCode: event.target.value }))}>
                  <option value="">-- Khong gan --</option>
                  {tenantRows.map((tenant) => <option key={tenant.tenantCode} value={tenant.tenantCode}>{tenant.tenantCode}</option>)}
                </select>
              </label>
              <div className="button-row">
                <button className="ghost-button" type="button" onClick={() => setShowPlatformDrawer(false)}>Huy</button>
                <button className="primary-button" type="submit" disabled={createPlatformAdminMutation.isPending}>{createPlatformAdminMutation.isPending ? "Dang tao..." : "Tao tai khoan"}</button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {showRoleDrawer ? (
        <div className="drawer-backdrop" role="presentation" onClick={() => setShowRoleDrawer(false)}>
          <aside className="drawer-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="section-title-row">
              <div>
                <h3>+ Tao vai tro moi</h3>
                <p className="section-note">Vai tro quan tri phai bat dau bang PLATFORM_.</p>
              </div>
              <button className="ghost-button" type="button" onClick={() => setShowRoleDrawer(false)}>Dong</button>
            </div>

            <form className="form-grid" onSubmit={(event: FormEvent) => {
              event.preventDefault();
              createRoleMutation.mutate();
            }}>
              <label>Ma vai tro *<input value={createRoleForm.roleKey} onChange={(event) => setCreateRoleForm((prev) => ({ ...prev, roleKey: event.target.value }))} placeholder="PLATFORM_ACCESS_ADMIN" required /></label>
              <label>Ten vai tro *<input value={createRoleForm.roleName} onChange={(event) => setCreateRoleForm((prev) => ({ ...prev, roleName: event.target.value }))} required /></label>
              <label>
                Pham vi
                <select value={createRoleForm.roleScope} onChange={(event) => setCreateRoleForm((prev) => ({ ...prev, roleScope: event.target.value as "platform" | "tenant" }))}>
                  <option value="platform">He thong</option>
                </select>
              </label>
              <label>Danh sach quyen (CSV)<input value={createRoleForm.permissionKeys} onChange={(event) => setCreateRoleForm((prev) => ({ ...prev, permissionKeys: event.target.value }))} placeholder="platform.account.update, platform.role.assign" /></label>
              <div className="button-row">
                <button className="ghost-button" type="button" onClick={() => setShowRoleDrawer(false)}>Huy</button>
                <button className="primary-button" type="submit" disabled={createRoleMutation.isPending}>{createRoleMutation.isPending ? "Dang tao..." : "Tao vai tro"}</button>
              </div>
            </form>
          </aside>
        </div>
      ) : null}

      {renewalTenantCode && activeSection !== "stores" ? (
        <div className="drawer-backdrop" role="presentation" onClick={() => setRenewalTenantCode(null)}>
          <aside className="drawer-panel modal-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>Gia han doanh nghiep - {renewalTenant?.legalName ?? renewalTenantCode}</h3>
            <p className="section-note">
              Goi: {renewalTenant?.subscriptionPlan ?? "standard"} | Het han: {formatExpiryDate(renewalTenant?.subscriptionExpiresAt ?? null)}
            </p>
            <div className="form-grid">
              <label className="inline-check"><input type="radio" name="renewal" checked={renewalMonths === 1} onChange={() => setRenewalMonths(1)} /> 1 thang</label>
              <label className="inline-check"><input type="radio" name="renewal" checked={renewalMonths === 3} onChange={() => setRenewalMonths(3)} /> 3 thang</label>
              <label className="inline-check"><input type="radio" name="renewal" checked={renewalMonths === 12} onChange={() => setRenewalMonths(12)} /> 12 thang</label>
              <p className="section-note">Het han moi: {renewalPreviewDate.toLocaleDateString("vi-VN")}</p>

              {!canDirectRenew ? (
                <label>
                  Ma gia han
                  <input value={renewalKeyInput} onChange={(event) => setRenewalKeyInput(event.target.value)} placeholder="Nhap renewal key" />
                </label>
              ) : null}

              {canCreateRenewalKey ? (
                <div className="button-row compact-actions">
                  <button className="ghost-button" type="button" onClick={() => createRenewalKeyMutation.mutate()} disabled={createRenewalKeyMutation.isPending}>
                    {createRenewalKeyMutation.isPending ? "Dang tao ma..." : "Tao Renewal Key"}
                  </button>
                  {generatedRenewalKey ? <span className="status-pill">Ma: {generatedRenewalKey}</span> : null}
                </div>
              ) : null}

              <label>
                Ghi chu
                <input value={renewalNote} onChange={(event) => setRenewalNote(event.target.value)} placeholder="Ghi chu gia han" />
              </label>

              <div className="button-row">
                <button className="ghost-button" type="button" onClick={() => setRenewalTenantCode(null)}>Huy</button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => renewTenantMutation.mutate()}
                  disabled={
                    renewTenantMutation.isPending
                    || (!canDirectRenew && !renewalKeyInput.trim())
                  }
                >
                  {renewTenantMutation.isPending ? "Dang gia han..." : "Xac nhan gia han"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {selectedTicketIndex !== null ? (
        <div className="drawer-backdrop" role="presentation" onClick={() => setSelectedTicketIndex(null)}>
          <aside className="drawer-panel modal-panel" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <h3>Trao doi ho tro</h3>
            <p className="section-note">{analytics?.supportTickets[selectedTicketIndex]?.tenant} · {analytics?.supportTickets[selectedTicketIndex]?.title}</p>
            <div className="chat-thread">
              <p><strong>Cua hang:</strong> Chung toi dang cho xac nhan them log loi.</p>
              <p><strong>Quan tri:</strong> Da ghi nhan ticket va se phan hoi trong vong 15 phut.</p>
            </div>
            <div className="button-row">
              <button className="ghost-button" type="button" onClick={() => setSelectedTicketIndex(null)}>Dong</button>
              <button className="primary-button" type="button">Gui phan hoi</button>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
