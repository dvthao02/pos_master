package com.iorder.apibackend.crm;

import com.iorder.apibackend.auth.Account;
import com.iorder.apibackend.auth.AccountRepository;
import com.iorder.apibackend.auth.AccountRoleBindingRepository;
import com.iorder.apibackend.auth.AccountTenant;
import com.iorder.apibackend.auth.AccountTenantRepository;
import com.iorder.apibackend.platform.Permission;
import com.iorder.apibackend.platform.PermissionRepository;
import com.iorder.apibackend.platform.Role;
import com.iorder.apibackend.platform.RoleRepository;
import com.iorder.apibackend.platform.Tenant;
import com.iorder.apibackend.platform.TenantBranch;
import com.iorder.apibackend.platform.TenantBranchRepository;
import com.iorder.apibackend.platform.TenantRepository;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.HashSet;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CrmAdminService {
    private static final Set<String> ACCOUNT_STATUSES = Set.of("pending", "active", "locked", "disabled");
    private static final Set<String> ACCESS_LEVELS =
        Set.of("owner", "admin", "manager", "cashier", "inventory", "auditor", "api", "staff");
    private static final Set<String> ACCESS_STATUSES = Set.of("active", "disabled");
    private static final Set<String> TENANT_STATUSES = Set.of("trial", "active", "suspended", "closed");
    private static final Set<String> ROLE_SCOPES = Set.of("platform", "tenant");

    private static final String DEFAULT_SUBSCRIPTION_PLAN = "standard";
    private static final String PLATFORM_ROLE_PREFIX = "PLATFORM_";
    private static final Set<String> ADMIN_OVERRIDE_ROLES =
        Set.of("SUPER_ADMIN", "PLATFORM_ADMIN");
    private static final Set<String> DIRECT_RENEWAL_ROLES =
        Set.of("SUPER_ADMIN", "PLATFORM_ADMIN", "PLATFORM_BILLING");
    private static final Set<String> KEY_RENEWAL_ROLES =
        Set.of("PLATFORM_SALES", "PLATFORM_SUPPORT");
    private static final Pattern SQL_IDENTIFIER_PATTERN = Pattern.compile("^[a-z][a-z0-9_]{2,62}$");
    private static final Pattern ROLE_KEY_PATTERN = Pattern.compile("^[A-Z][A-Z0-9_]{2,99}$");
    private static final String DEFAULT_CENTRAL_BRANCH_CODE = "cn000001";
    private static final String DEFAULT_CENTRAL_BRANCH_NAME = "Chi nhanh trung tam";
    private static final ZoneId DISPLAY_ZONE_ID = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DISPLAY_TIME_FORMATTER =
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(DISPLAY_ZONE_ID);

    private final AccountRepository accountRepository;
    private final AccountTenantRepository accountTenantRepository;
    private final AccountRoleBindingRepository accountRoleBindingRepository;
    private final TenantRepository tenantRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final TenantBranchRepository tenantBranchRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    public CrmAdminService(
        AccountRepository accountRepository,
        AccountTenantRepository accountTenantRepository,
        AccountRoleBindingRepository accountRoleBindingRepository,
        TenantRepository tenantRepository,
        RoleRepository roleRepository,
        PermissionRepository permissionRepository,
        TenantBranchRepository tenantBranchRepository,
        PasswordEncoder passwordEncoder,
        JdbcTemplate jdbcTemplate
    ) {
        this.accountRepository = accountRepository;
        this.accountTenantRepository = accountTenantRepository;
        this.accountRoleBindingRepository = accountRoleBindingRepository;
        this.tenantRepository = tenantRepository;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.tenantBranchRepository = tenantBranchRepository;
        this.passwordEncoder = passwordEncoder;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional(readOnly = true)
    public CrmBootstrapResponse getBootstrap() {
        List<CrmBootstrapResponse.TenantItem> tenants = tenantRepository.findAll(Sort.by("tenantCode")).stream()
            .map(tenant -> new CrmBootstrapResponse.TenantItem(tenant.getTenantCode(), tenant.getLegalName(), tenant.getStatus()))
            .toList();

        List<CrmBootstrapResponse.RoleItem> roles = roleRepository.findAll(roleSort()).stream()
            .map(role -> new CrmBootstrapResponse.RoleItem(role.getRoleKey(), role.getRoleName()))
            .toList();

        List<CrmBootstrapResponse.PermissionItem> permissions =
            permissionRepository.findAllByOrderByModuleKeyAscPermissionKeyAsc().stream()
                .map(permission -> new CrmBootstrapResponse.PermissionItem(
                    permission.getPermissionKey(),
                    permission.getPermissionName(),
                    permission.getModuleKey()
                ))
                .toList();

        return new CrmBootstrapResponse(tenants, roles, permissions);
    }

    @Transactional(readOnly = true)
    public List<RolePermissionSummaryResponse> getRoles() {
        List<Role> roles = roleRepository.findAll(roleSort());
        Map<String, List<String>> permissionKeysByRoleKey = queryPermissionKeysByRoleKey();

        return roles.stream()
            .map(role -> new RolePermissionSummaryResponse(
                role.getRoleKey(),
                role.getRoleName(),
                resolveRoleScope(role),
                permissionKeysByRoleKey.getOrDefault(role.getRoleKey(), List.of())
            ))
            .toList();
    }

    @Transactional
    public RolePermissionSummaryResponse createRole(CreateRoleRequest request) {
        String roleScope = normalizeRoleScope(request.roleScope());
        String roleKey = normalizeRoleKey(request.roleKey());
        String roleName = requireNonBlank(request.roleName(), "roleName is required");

        validateRoleScope(roleKey, roleScope);
        if (roleRepository.existsByRoleKeyIgnoreCase(roleKey)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "roleKey already exists");
        }

        try {
            jdbcTemplate.update(
                "insert into platform.roles (id, role_key, role_name, role_scope, is_system) values (gen_random_uuid(), ?, ?, ?, false)",
                roleKey,
                roleName,
                roleScope
            );
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "roleKey already exists", ex);
        }

        Role role = loadRoleByKey(roleKey);
        replaceRolePermissions(role, request.permissionKeys() == null ? List.of() : request.permissionKeys());
        return buildRoleSummary(role);
    }

    @Transactional
    public RolePermissionSummaryResponse updateRolePermissions(String roleKey, UpdateRolePermissionsRequest request) {
        Role role = loadRoleByKey(roleKey);
        replaceRolePermissions(role, request.permissionKeys() == null ? List.of() : request.permissionKeys());
        return buildRoleSummary(role);
    }

    @Transactional
    public RolePermissionSummaryResponse deleteRole(String roleKey) {
        Role role = loadRoleByKey(roleKey);
        if (role.isSystem()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Core role cannot be deleted");
        }
        long assignedCount = accountRoleBindingRepository.countBindingsByRoleId(role.getId());
        if (assignedCount > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role is still assigned to accounts");
        }

        RolePermissionSummaryResponse summary = buildRoleSummary(role);
        jdbcTemplate.update("delete from platform.role_permissions where role_id = ?", role.getId());
        roleRepository.delete(role);
        return summary;
    }

    @Transactional(readOnly = true)
    public CrmAnalyticsResponse getAnalytics() {
        try {
            Map<String, Object> dashboardRow = jdbcTemplate.queryForMap(
                """
                    select active_tenants, trial_tenants, suspended_tenants, total_tenants,
                           total_stores, total_accounts, total_platform_admins, estimated_revenue
                    from platform.v_crm_dashboard_snapshot
                    """
            );

            CrmAnalyticsResponse.DashboardSummary dashboard = new CrmAnalyticsResponse.DashboardSummary(
                toInt(dashboardRow.get("active_tenants")),
                toInt(dashboardRow.get("trial_tenants")),
                toInt(dashboardRow.get("suspended_tenants")),
                toInt(dashboardRow.get("total_tenants")),
                toInt(dashboardRow.get("total_stores")),
                toInt(dashboardRow.get("total_accounts")),
                toInt(dashboardRow.get("total_platform_admins")),
                toLong(dashboardRow.get("estimated_revenue"))
            );

            List<CrmAnalyticsResponse.SeriesPoint> tenantGrowthSeries = jdbcTemplate.query(
                """
                    select label, value
                    from platform.v_crm_monthly_tenant_growth
                    order by month_start
                    """,
                (rs, rowNum) -> new CrmAnalyticsResponse.SeriesPoint(rs.getString("label"), rs.getInt("value"))
            );

            List<CrmAnalyticsResponse.SeriesPoint> loginUsageSeries = jdbcTemplate.query(
                """
                    select label, value
                    from platform.v_crm_hourly_login_usage
                    order by hour_bucket
                    """,
                (rs, rowNum) -> new CrmAnalyticsResponse.SeriesPoint(rs.getString("label"), rs.getInt("value"))
            );

            List<CrmAnalyticsResponse.NotificationItem> notifications = jdbcTemplate.query(
                """
                    select title, tenant_code, event_time
                    from platform.v_crm_alert_items
                    where alert_group = 'notification'
                    order by event_time desc nulls last
                    limit 12
                    """,
                (rs, rowNum) -> new CrmAnalyticsResponse.NotificationItem(
                    rs.getString("title"),
                    rs.getString("tenant_code") == null ? "He thong" : rs.getString("tenant_code"),
                    formatRelativeTime(readInstant(rs.getTimestamp("event_time")))
                )
            );

            List<CrmAnalyticsResponse.SupportTicketItem> supportTickets = jdbcTemplate.query(
                """
                    select tenant_code, title, severity, status_label
                    from platform.v_crm_alert_items
                    where alert_group = 'ticket'
                    order by event_time desc nulls last
                    limit 12
                    """,
                (rs, rowNum) -> new CrmAnalyticsResponse.SupportTicketItem(
                    rs.getString("tenant_code"),
                    rs.getString("title"),
                    toTicketLevel(rs.getString("severity")),
                    rs.getString("status_label")
                )
            );

            List<CrmAnalyticsResponse.ActivityItem> recentActivities = jdbcTemplate.query(
                """
                    select title, event_time
                    from platform.v_crm_recent_activities
                    order by event_time desc nulls last
                    limit 12
                    """,
                (rs, rowNum) -> new CrmAnalyticsResponse.ActivityItem(
                    rs.getString("title"),
                    formatRelativeTime(readInstant(rs.getTimestamp("event_time")))
                )
            );

            List<CrmAnalyticsResponse.AuditEventItem> auditEvents = jdbcTemplate.query(
                """
                    select event_time, admin_username, action_key, object_code, ip_address
                    from platform.v_crm_audit_events
                    order by event_time desc nulls last
                    limit 20
                    """,
                (rs, rowNum) -> new CrmAnalyticsResponse.AuditEventItem(
                    formatRelativeTime(readInstant(rs.getTimestamp("event_time"))),
                    rs.getString("admin_username") == null ? "system" : rs.getString("admin_username"),
                    rs.getString("action_key"),
                    rs.getString("object_code"),
                    rs.getString("ip_address") == null ? "-" : rs.getString("ip_address")
                )
            );

            List<CrmAnalyticsResponse.SuspiciousSessionItem> suspiciousSessions = jdbcTemplate.query(
                """
                    select username, ip_address, note, status_code
                    from platform.v_crm_suspicious_sessions
                    order by event_time desc nulls last
                    limit 20
                    """,
                (rs, rowNum) -> new CrmAnalyticsResponse.SuspiciousSessionItem(
                    rs.getString("username"),
                    rs.getString("ip_address") == null ? "-" : rs.getString("ip_address"),
                    rs.getString("note"),
                    rs.getString("status_code")
                )
            );

            return new CrmAnalyticsResponse(
                dashboard,
                tenantGrowthSeries,
                loginUsageSeries,
                notifications,
                supportTickets,
                recentActivities,
                auditEvents,
                suspiciousSessions
            );
        } catch (DataAccessException ex) {
            return buildAnalyticsFallback();
        }
    }

    @Transactional(readOnly = true)
    public List<EmployeeSummaryResponse> getEmployees() {
        List<Account> accounts = accountRepository.findAll(Sort.by(Sort.Direction.ASC, "username"));
        List<EmployeeSummaryResponse> result = new ArrayList<>();
        for (Account account : accounts) {
            result.add(toEmployeeSummary(account));
        }
        return result;
    }

    @Transactional
    public EmployeeSummaryResponse createEmployee(CreateEmployeeRequest request) {
        String username = normalizeUsername(request.username());
        if (accountRepository.existsByUsernameIgnoreCase(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already exists");
        }
        String password = requireNonBlank(request.password(), "password is required");
        String fullName = requireNonBlank(request.fullName(), "fullName is required");
        String status = normalizeAccountStatus(request.status());

        Account account = new Account();
        account.setUsername(username);
        account.setPassword(passwordEncoder.encode(password));
        account.setFullName(fullName);
        account.setEmail(normalizeNullable(request.email()));
        account.setPhone(normalizeNullable(request.phone()));
        account.setStatus(status);
        account.setPlatformAdmin(request.platformAdmin());
        account = accountRepository.save(account);

        if (request.platformRoleKeys() != null && !request.platformRoleKeys().isEmpty()) {
            replacePlatformRoles(account, request.platformRoleKeys());
        }
        return toEmployeeSummary(accountRepository.findById(account.getId()).orElseThrow());
    }

    @Transactional
    public EmployeeSummaryResponse updateEmployee(UUID accountId, UpdateEmployeeRequest request) {
        Account account = loadAccount(accountId);
        account.setFullName(requireNonBlank(request.fullName(), "fullName is required"));
        account.setEmail(normalizeNullable(request.email()));
        account.setPhone(normalizeNullable(request.phone()));
        account.setStatus(normalizeAccountStatus(request.status()));
        account.setPlatformAdmin(request.platformAdmin());
        accountRepository.save(account);
        return toEmployeeSummary(account);
    }

    @Transactional
    public EmployeeSummaryResponse updateEmployeePassword(UUID accountId, UpdateEmployeePasswordRequest request) {
        Account account = loadAccount(accountId);
        String newPassword = requireNonBlank(request.newPassword(), "newPassword is required");
        account.setPassword(passwordEncoder.encode(newPassword));
        accountRepository.save(account);
        return toEmployeeSummary(account);
    }

    @Transactional
    public EmployeeSummaryResponse updatePlatformRoles(UUID accountId, UpdatePlatformRolesRequest request) {
        Account account = loadAccount(accountId);
        replacePlatformRoles(account, request.roleKeys() == null ? List.of() : request.roleKeys());
        return toEmployeeSummary(accountRepository.findById(accountId).orElseThrow());
    }

    @Transactional
    public EmployeeSummaryResponse upsertTenantAccess(UUID accountId, String tenantCode, UpsertTenantAccessRequest request) {
        Account account = loadAccount(accountId);
        Tenant tenant = loadTenantByCode(tenantCode);

        String accessLevel = normalizeAccessLevel(request.accessLevel());
        String accessStatus = normalizeAccessStatus(request.status());

        AccountTenant accountTenant = accountTenantRepository.findByAccountIdAndTenantId(accountId, tenant.getId())
            .orElseGet(() -> {
                AccountTenant created = new AccountTenant();
                created.setAccountId(account.getId());
                created.setTenantId(tenant.getId());
                return created;
            });
        accountTenant.setAccessLevel(accessLevel);
        accountTenant.setStatus(accessStatus);
        accountTenant.setDefaultBranchCode(normalizeNullable(request.defaultBranchCode()));
        accountTenantRepository.save(accountTenant);

        replaceTenantRoles(accountId, tenant.getId(), request.roleKeys() == null ? List.of() : request.roleKeys());
        return toEmployeeSummary(accountRepository.findById(accountId).orElseThrow());
    }

    @Transactional
    public EmployeeSummaryResponse removeTenantAccess(UUID accountId, String tenantCode) {
        Account account = loadAccount(accountId);
        Tenant tenant = loadTenantByCode(tenantCode);

        accountRoleBindingRepository.deleteTenantRoles(accountId, tenant.getId());
        accountTenantRepository.deleteByAccountIdAndTenantId(accountId, tenant.getId());

        return toEmployeeSummary(account);
    }

    @Transactional
    public EmployeeSummaryResponse disableEmployee(UUID accountId) {
        Account account = loadAccount(accountId);
        if ("dvthao".equalsIgnoreCase(account.getUsername())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Root administrator cannot be disabled");
        }

        accountRoleBindingRepository.deleteAllRolesByAccountId(accountId);
        accountTenantRepository.deleteByAccountId(accountId);

        account.setPlatformAdmin(false);
        account.setStatus("disabled");
        accountRepository.save(account);

        return toEmployeeSummary(account);
    }

    @Transactional(readOnly = true)
    public List<EnterpriseSummaryResponse> getEnterprises(
        String search,
        String subscriptionPlan,
        String status,
        Integer expiringInDays
    ) {
        List<Tenant> tenants = tenantRepository.findAll(Sort.by(Sort.Direction.ASC, "tenantCode"));
        if (tenants.isEmpty()) {
            return List.of();
        }

        String normalizedSearch = search == null ? "" : search.trim().toLowerCase(Locale.ROOT);
        String normalizedPlan = subscriptionPlan == null || subscriptionPlan.isBlank()
            ? null
            : subscriptionPlan.trim().toLowerCase(Locale.ROOT);
        String normalizedStatus = status == null || status.isBlank() ? null : normalizeTenantStatus(status);
        int expiringDays = expiringInDays == null ? 0 : Math.max(0, expiringInDays);

        List<UUID> tenantIds = tenants.stream().map(Tenant::getId).toList();
        Map<UUID, Long> storeCountByTenant = tenantBranchRepository.countStoresByTenantIds(tenantIds).stream()
            .collect(Collectors.toMap(TenantBranchRepository.TenantStoreCountRow::getTenantId, row -> row.getTotalStores()));
        List<AccountTenant> tenantAccessRows = accountTenantRepository.findByTenantIdIn(tenantIds);
        Map<UUID, List<AccountTenant>> tenantAccessByTenant = tenantAccessRows.stream()
            .collect(Collectors.groupingBy(AccountTenant::getTenantId));

        List<UUID> accountIds = tenantAccessRows.stream().map(AccountTenant::getAccountId).distinct().toList();
        Map<UUID, Account> accountById = new HashMap<>();
        if (!accountIds.isEmpty()) {
            for (Account account : accountRepository.findAllById(accountIds)) {
                accountById.put(account.getId(), account);
            }
        }

        Instant now = Instant.now();
        Instant expiringLimit = expiringDays > 0 ? now.plus(Duration.ofDays(expiringDays)) : null;

        return tenants.stream()
            .filter(tenant -> normalizedSearch.isBlank() || matchesSearch(tenant, normalizedSearch))
            .filter(tenant -> normalizedPlan == null || normalizedPlan.equalsIgnoreCase(tenant.getSubscriptionPlan()))
            .filter(tenant -> normalizedStatus == null || normalizedStatus.equalsIgnoreCase(tenant.getStatus()))
            .filter(tenant -> {
                if (expiringLimit == null || tenant.getSubscriptionExpiresAt() == null) {
                    return true;
                }
                return !tenant.getSubscriptionExpiresAt().isAfter(expiringLimit);
            })
            .map(tenant -> {
                ResponsibleContact responsible = resolveResponsible(
                    tenantAccessByTenant.getOrDefault(tenant.getId(), List.of()),
                    accountById
                );
                return new EnterpriseSummaryResponse(
                    tenant.getId(),
                    tenant.getTenantCode(),
                    tenant.getSchemaName(),
                    tenant.getLegalName(),
                    resolvePrimaryDomain(tenant),
                    tenant.getSubscriptionPlan(),
                    tenant.getCreatedAt(),
                    tenant.getSubscriptionExpiresAt(),
                    tenant.getStatus(),
                    responsible.accountId() == null ? null : responsible.accountId().toString(),
                    responsible.username(),
                    responsible.fullName(),
                    storeCountByTenant.getOrDefault(tenant.getId(), 0L)
                );
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public List<TenantSchemaSummaryResponse> getTenantSchemas() {
        List<Tenant> tenants = tenantRepository.findAll(Sort.by(Sort.Direction.ASC, "tenantCode"));
        if (tenants.isEmpty()) {
            return List.of();
        }

        List<UUID> tenantIds = tenants.stream().map(Tenant::getId).toList();
        Map<UUID, Long> storeCountByTenant = tenantBranchRepository.countStoresByTenantIds(tenantIds).stream()
            .collect(Collectors.toMap(TenantBranchRepository.TenantStoreCountRow::getTenantId, row -> row.getTotalStores()));

        List<AccountTenant> tenantAccessRows = accountTenantRepository.findByTenantIdIn(tenantIds);
        Map<UUID, List<AccountTenant>> tenantAccessByTenant = tenantAccessRows.stream()
            .collect(Collectors.groupingBy(AccountTenant::getTenantId));

        List<UUID> accountIds = tenantAccessRows.stream().map(AccountTenant::getAccountId).distinct().toList();
        Map<UUID, Account> accountById = new HashMap<>();
        if (!accountIds.isEmpty()) {
            for (Account account : accountRepository.findAllById(accountIds)) {
                accountById.put(account.getId(), account);
            }
        }

        return tenants.stream().map(tenant -> {
            ResponsibleContact responsible = resolveResponsible(
                tenantAccessByTenant.getOrDefault(tenant.getId(), List.of()),
                accountById
            );
            return new TenantSchemaSummaryResponse(
                tenant.getId(),
                tenant.getTenantCode(),
                tenant.getSchemaName(),
                tenant.getLegalName(),
                tenant.getBrandName(),
                tenant.getSubscriptionPlan(),
                tenant.getStatus(),
                tenant.getCreatedAt(),
                tenant.getSubscriptionExpiresAt(),
                responsible.accountId() == null ? null : responsible.accountId().toString(),
                responsible.username(),
                responsible.fullName(),
                storeCountByTenant.getOrDefault(tenant.getId(), 0L)
            );
        }).toList();
    }

    @Transactional
    public TenantSchemaSummaryResponse createTenantSchema(CreateTenantSchemaRequest request) {
        String requestedTenantCode = normalizeOptionalSqlIdentifier(request.tenantCode());
        String tenantCode = requestedTenantCode != null ? requestedTenantCode : nextTenantCodeFromDatabase();
        String schemaName = normalizeOptionalSqlIdentifier(request.schemaName());
        String expectedSchemaName = buildTenantSchemaName(tenantCode);
        if (tenantRepository.existsByTenantCodeIgnoreCase(tenantCode)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "tenantCode already exists");
        }
        if (schemaName != null && !expectedSchemaName.equals(schemaName)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "schemaName must match " + expectedSchemaName + " for the current tenantCode"
            );
        }
        if (tenantRepository.existsBySchemaNameIgnoreCase(expectedSchemaName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "schemaName already exists");
        }
        if (schemaExists(expectedSchemaName)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "schema already exists in database");
        }

        String legalName = requireNonBlank(request.legalName(), "legalName is required");
        String brandName = normalizeNullable(request.brandName());
        String subscriptionPlan = normalizeSubscriptionPlan(request.subscriptionPlan());

        ProvisionTenantResult provisioned = provisionTenantSchema(tenantCode, legalName, brandName, subscriptionPlan);
        Tenant tenant = tenantRepository.findById(provisioned.tenantId())
            .orElseGet(() -> tenantRepository.findByTenantCodeIgnoreCase(tenantCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Tenant provision result was not persisted")));

        if (!expectedSchemaName.equalsIgnoreCase(provisioned.schemaName())) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Provisioned schema does not match expected schema name"
            );
        }

        if (request.status() != null && !request.status().isBlank()) {
            String normalizedStatus = normalizeTenantStatus(request.status());
            if (!normalizedStatus.equalsIgnoreCase(tenant.getStatus())) {
                tenant.setStatus(normalizedStatus);
                tenant = tenantRepository.save(tenant);
            }
        }

        tenant = ensureTenantExpiry(tenant);
        ensureCentralStoreExists(tenant);

        if (request.responsibleAccountId() != null) {
            assignTenantResponsible(tenant, request.responsibleAccountId());
        }

        return buildTenantSchemaSummary(tenant);
    }

    @Transactional
    public TenantSchemaSummaryResponse updateTenantSchema(String tenantCode, UpdateTenantSchemaRequest request) {
        Tenant tenant = loadTenantByCode(tenantCode);

        if (request.legalName() != null) {
            tenant.setLegalName(requireNonBlank(request.legalName(), "legalName must not be blank"));
        }
        if (request.brandName() != null) {
            tenant.setBrandName(normalizeNullable(request.brandName()));
        }
        if (request.subscriptionPlan() != null) {
            tenant.setSubscriptionPlan(normalizeSubscriptionPlan(request.subscriptionPlan()));
        }
        if (request.status() != null) {
            tenant.setStatus(normalizeTenantStatus(request.status()));
        }
        if (request.createdAt() != null) {
            tenant.setCreatedAt(request.createdAt());
        }
        if (request.subscriptionExpiresAt() != null) {
            tenant.setSubscriptionExpiresAt(request.subscriptionExpiresAt());
        }
        tenant = tenantRepository.save(tenant);
        tenant = ensureTenantExpiry(tenant);

        if (request.responsibleAccountId() != null) {
            assignTenantResponsible(tenant, request.responsibleAccountId());
        }

        return buildTenantSchemaSummary(tenant);
    }

    @Transactional(readOnly = true)
    public List<StoreSummaryResponse> getStores(String tenantCode) {
        Tenant tenant = loadTenantByCode(tenantCode);
        ResponsibleContact responsible = resolveResponsibleForTenant(tenant.getId());
        return tenantBranchRepository.findByTenantIdOrderByBranchCodeAsc(tenant.getId()).stream()
            .map(store -> toStoreSummary(store, tenant, responsible))
            .toList();
    }

    @Transactional
    public StoreSummaryResponse createStore(CreateStoreRequest request) {
        String tenantCode = requireNonBlank(request.tenantCode(), "tenantCode is required");
        Tenant tenant = loadTenantByCode(tenantCode);
        String branchCode = normalizeBranchCode(request.branchCode());
        if (tenantBranchRepository.findByTenantIdAndBranchCodeIgnoreCase(tenant.getId(), branchCode).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "branchCode already exists in tenant");
        }
        TenantBranch store = new TenantBranch();
        store.setTenantId(tenant.getId());
        store.setBranchCode(branchCode);
        store.setBranchName(requireNonBlank(request.branchName(), "branchName is required"));
        store.setSourceSchemaName(resolveTenantSourceSchema(tenant));
        store.setActive(true);
        try {
            store = tenantBranchRepository.save(store);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Store code already exists", ex);
        }
        return toStoreSummary(store, tenant, resolveResponsibleForTenant(tenant.getId()));
    }

    @Transactional
    public StoreSummaryResponse updateStore(UUID storeId, UpdateStoreRequest request) {
        TenantBranch store = tenantBranchRepository.findById(storeId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Store not found"));
        Tenant tenant = tenantRepository.findById(store.getTenantId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found"));

        if (request.branchName() != null && !request.branchName().isBlank()) {
            store.setBranchName(request.branchName().trim());
        }
        if (request.sourceSchemaName() != null && !request.sourceSchemaName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sourceSchemaName is immutable");
        }
        if (request.active() != null) {
            store.setActive(request.active());
        }
        store = tenantBranchRepository.save(store);
        return toStoreSummary(store, tenant, resolveResponsibleForTenant(tenant.getId()));
    }

    @Transactional
    public StoreSummaryResponse disableStore(UUID storeId) {
        TenantBranch store = tenantBranchRepository.findById(storeId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Store not found"));
        Tenant tenant = tenantRepository.findById(store.getTenantId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found"));
        store.setActive(false);
        store = tenantBranchRepository.save(store);
        return toStoreSummary(store, tenant, resolveResponsibleForTenant(tenant.getId()));
    }

    @Transactional
    public TenantSchemaSummaryResponse updateTenantSubscriptionPlan(
        String tenantCode,
        UpdateTenantPlanRequest request,
        List<String> actorRoles
    ) {
        Tenant tenant = loadTenantByCode(tenantCode);

        Set<String> normalizedRoles = normalizeRoles(actorRoles);
        boolean hasAdminOverride = hasAnyRole(normalizedRoles, ADMIN_OVERRIDE_ROLES);
        if (!hasAdminOverride) {
            if (request.createdAt() != null) {
                throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only admin can update createdAt"
                );
            }

            if (request.subscriptionExpiresAt() != null) {
                Instant now = Instant.now();
                Instant baseline = tenant.getSubscriptionExpiresAt();
                if (baseline == null || baseline.isBefore(now)) {
                    baseline = now;
                }

                if (request.subscriptionExpiresAt().isBefore(baseline)) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Non-admin updates must not reduce subscription expiry"
                    );
                }
            }
        }

        tenant.setSubscriptionPlan(normalizeSubscriptionPlan(request.subscriptionPlan()));
        if (request.createdAt() != null) {
            tenant.setCreatedAt(request.createdAt());
        }
        if (request.subscriptionExpiresAt() != null) {
            tenant.setSubscriptionExpiresAt(request.subscriptionExpiresAt());
        }
        tenant = tenantRepository.save(tenant);
        tenant = ensureTenantExpiry(tenant);
        return buildTenantSchemaSummary(tenant);
    }

    @Transactional
    public RenewalKeyResponse createRenewalKey(
        String tenantCode,
        CreateRenewalKeyRequest request,
        UUID createdByAccountId
    ) {
        Tenant tenant = loadTenantByCode(tenantCode);
        int extendMonths = normalizeExtendMonths(request.extendMonths());
        int validDays = normalizeValidDays(request.validDays());
        String note = normalizeNullable(request.note());
        Instant expiresAt = Instant.now().plus(Duration.ofDays(validDays));

        String keyCode = createUniqueRenewalKeyCode();
        jdbcTemplate.update(
            """
                insert into platform.renewal_keys (
                    id, key_code, tenant_id, extend_months, created_by, expires_at, status, note, created_at, updated_at
                )
                values (gen_random_uuid(), ?, ?, ?, ?, ?, 'active', ?, now(), now())
                """,
            keyCode,
            tenant.getId(),
            extendMonths,
            createdByAccountId,
            Timestamp.from(expiresAt),
            note
        );

        return new RenewalKeyResponse(keyCode, tenant.getTenantCode(), extendMonths, "active", expiresAt, null);
    }

    @Transactional
    public TenantSchemaSummaryResponse renewTenantSchema(
        String tenantCode,
        RenewTenantRequest request,
        UUID accountId,
        List<String> actorRoles
    ) {
        Tenant tenant = loadTenantByCode(tenantCode);
        markExpiredRenewalKeys();

        Set<String> normalizedRoles = normalizeRoles(actorRoles);
        boolean hasDirectRenewRole = hasAnyRole(normalizedRoles, DIRECT_RENEWAL_ROLES);
        boolean hasKeyRenewRole = hasAnyRole(normalizedRoles, KEY_RENEWAL_ROLES);
        if (!hasDirectRenewRole && !hasKeyRenewRole) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Current role is not allowed to renew subscription");
        }

        int extendMonths;
        if (hasDirectRenewRole) {
            extendMonths = normalizeExtendMonths(request.extendMonths());
        } else {
            String renewalKey = requireNonBlank(request.renewalKey(), "renewalKey is required");
            RenewalKeyRow keyRow = loadRenewalKeyForUpdate(renewalKey);
            validateRenewalKeyForTenant(keyRow, tenant.getId());
            consumeRenewalKey(keyRow.id(), accountId);
            extendMonths = keyRow.extendMonths();
        }

        Instant newExpiry = calculateNewExpiry(tenant.getSubscriptionExpiresAt(), extendMonths);
        tenant.setSubscriptionExpiresAt(newExpiry);
        if ("suspended".equalsIgnoreCase(tenant.getStatus())) {
            tenant.setStatus("active");
        }
        tenant = tenantRepository.save(tenant);
        return buildTenantSchemaSummary(tenant);
    }

    private EmployeeSummaryResponse toEmployeeSummary(Account account) {
        List<String> platformRoles = accountRoleBindingRepository.findPlatformRoleKeys(account.getId());
        List<AccountTenantRepository.AccountTenantAccessRow> tenantRows = accountTenantRepository.findTenantAccessRows(account.getId());
        List<EmployeeSummaryResponse.TenantAccessItem> tenantAccesses = tenantRows.stream()
            .map(row -> {
                List<String> tenantRoleKeys = accountRoleBindingRepository.findTenantRoleKeys(account.getId(), row.getTenantId());
                if (tenantRoleKeys.isEmpty()) {
                    tenantRoleKeys = deriveTenantRoleKeysFromAccessLevel(row.getAccessLevel());
                }
                return new EmployeeSummaryResponse.TenantAccessItem(
                    row.getTenantCode(),
                    row.getAccessLevel(),
                    row.getStatus(),
                    row.getDefaultBranchCode(),
                    tenantRoleKeys
                );
            })
            .toList();
        return new EmployeeSummaryResponse(
            account.getId(),
            account.getUsername(),
            account.getFullName(),
            account.getEmail(),
            account.getPhone(),
            account.getStatus(),
            account.isPlatformAdmin(),
            platformRoles,
            tenantAccesses
        );
    }

    private void replacePlatformRoles(Account account, List<String> roleKeysInput) {
        List<Role> roles = resolveRoles(roleKeysInput);
        for (Role role : roles) {
            if (!"platform".equals(resolveRoleScope(role))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid platform role: " + role.getRoleKey());
            }
        }
        accountRoleBindingRepository.deletePlatformRoles(account.getId());
        for (Role role : roles) {
            accountRoleBindingRepository.insertPlatformRole(account.getId(), role.getId());
        }
        account.setPlatformAdmin(!roles.isEmpty());
        accountRepository.save(account);
    }

    private void replaceTenantRoles(UUID accountId, UUID tenantId, List<String> roleKeysInput) {
        List<Role> roles = resolveRoles(roleKeysInput);
        for (Role role : roles) {
            if (!"tenant".equals(resolveRoleScope(role))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Platform role is not allowed in tenant scope");
            }
        }
        accountRoleBindingRepository.deleteTenantRoles(accountId, tenantId);
        for (Role role : roles) {
            accountRoleBindingRepository.insertTenantRole(accountId, role.getId(), tenantId);
        }
    }

    private List<Role> resolveRoles(List<String> roleKeysInput) {
        List<String> normalizedRoleKeys = normalizeRoleKeys(roleKeysInput);
        if (normalizedRoleKeys.isEmpty()) {
            return List.of();
        }
        List<Role> roles = roleRepository.findByRoleKeyIn(normalizedRoleKeys);
        Set<String> found = roles.stream().map(Role::getRoleKey).collect(Collectors.toSet());
        List<String> missing = normalizedRoleKeys.stream().filter(roleKey -> !found.contains(roleKey)).toList();
        if (!missing.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role keys: " + String.join(",", missing));
        }
        Map<String, Role> roleByKey = new HashMap<>();
        for (Role role : roles) {
            roleByKey.put(role.getRoleKey(), role);
        }
        List<Role> ordered = new ArrayList<>();
        for (String roleKey : normalizedRoleKeys) {
            ordered.add(roleByKey.get(roleKey));
        }
        return ordered;
    }

    private List<String> normalizeRoleKeys(List<String> roleKeysInput) {
        if (roleKeysInput == null) {
            return List.of();
        }
        LinkedHashSet<String> result = new LinkedHashSet<>();
        for (String roleKey : roleKeysInput) {
            if (roleKey == null || roleKey.isBlank()) {
                continue;
            }
            result.add(roleKey.trim().toUpperCase(Locale.ROOT));
        }
        return result.stream().toList();
    }

    private TenantSchemaSummaryResponse buildTenantSchemaSummary(Tenant tenant) {
        List<AccountTenant> tenantAccessRows = accountTenantRepository.findByTenantId(tenant.getId());
        List<UUID> accountIds = tenantAccessRows.stream().map(AccountTenant::getAccountId).distinct().toList();
        Map<UUID, Account> accountById = new HashMap<>();
        if (!accountIds.isEmpty()) {
            for (Account account : accountRepository.findAllById(accountIds)) {
                accountById.put(account.getId(), account);
            }
        }
        ResponsibleContact responsible = resolveResponsible(tenantAccessRows, accountById);
        long storeCount = tenantBranchRepository.countStoresByTenantIds(List.of(tenant.getId())).stream()
            .map(TenantBranchRepository.TenantStoreCountRow::getTotalStores)
            .findFirst()
            .orElse(0L);
        return new TenantSchemaSummaryResponse(
            tenant.getId(),
            tenant.getTenantCode(),
            tenant.getSchemaName(),
            tenant.getLegalName(),
            tenant.getBrandName(),
            tenant.getSubscriptionPlan(),
            tenant.getStatus(),
            tenant.getCreatedAt(),
            tenant.getSubscriptionExpiresAt(),
            responsible.accountId() == null ? null : responsible.accountId().toString(),
            responsible.username(),
            responsible.fullName(),
            storeCount
        );
    }

    private ResponsibleContact resolveResponsible(List<AccountTenant> accessRows, Map<UUID, Account> accountById) {
        List<AccountTenant> sorted = accessRows.stream()
            .sorted(Comparator
                .comparing((AccountTenant row) -> !"active".equalsIgnoreCase(row.getStatus()))
                .thenComparingInt(row -> accessLevelPriority(row.getAccessLevel())))
            .toList();

        for (AccountTenant row : sorted) {
            Account account = accountById.get(row.getAccountId());
            if (account == null) {
                continue;
            }
            return new ResponsibleContact(account.getId(), account.getUsername(), account.getFullName());
        }
        return ResponsibleContact.EMPTY;
    }

    private int accessLevelPriority(String accessLevel) {
        if (accessLevel == null) {
            return 99;
        }
        return switch (accessLevel.toLowerCase(Locale.ROOT)) {
            case "owner" -> 0;
            case "admin" -> 1;
            case "manager" -> 2;
            case "staff" -> 3;
            case "cashier" -> 4;
            case "inventory" -> 5;
            case "auditor" -> 6;
            case "api" -> 7;
            default -> 99;
        };
    }

    private void assignTenantResponsible(Tenant tenant, UUID responsibleAccountId) {
        Account account = loadAccount(responsibleAccountId);
        List<AccountTenant> tenantRows = accountTenantRepository.findByTenantId(tenant.getId());

        for (AccountTenant row : tenantRows) {
            if (row.getAccountId().equals(responsibleAccountId)) {
                continue;
            }
            if ("owner".equalsIgnoreCase(row.getAccessLevel())) {
                row.setAccessLevel("admin");
                accountTenantRepository.save(row);
            }
        }

        AccountTenant responsible = accountTenantRepository.findByAccountIdAndTenantId(responsibleAccountId, tenant.getId())
            .orElseGet(() -> {
                AccountTenant created = new AccountTenant();
                created.setAccountId(account.getId());
                created.setTenantId(tenant.getId());
                return created;
            });
        responsible.setAccessLevel("owner");
        responsible.setStatus("active");
        accountTenantRepository.save(responsible);
    }

    private List<String> deriveTenantRoleKeysFromAccessLevel(String accessLevel) {
        if (accessLevel == null || accessLevel.isBlank()) {
            return List.of();
        }
        return switch (accessLevel.trim().toLowerCase(Locale.ROOT)) {
            case "owner" -> List.of("TENANT_OWNER");
            case "admin" -> List.of("TENANT_ADMIN");
            case "manager" -> List.of("STORE_MANAGER");
            case "cashier" -> List.of("CASHIER");
            case "inventory" -> List.of("INVENTORY");
            case "auditor" -> List.of("AUDITOR");
            case "staff" -> List.of("STORE_STAFF");
            case "api" -> List.of("STORE_ADMIN");
            default -> List.of();
        };
    }

    private boolean schemaExists(String schemaName) {
        Boolean exists = jdbcTemplate.queryForObject(
            "select exists(select 1 from information_schema.schemata where schema_name = ?)",
            Boolean.class,
            schemaName
        );
        return Boolean.TRUE.equals(exists);
    }

    private ProvisionTenantResult provisionTenantSchema(
        String tenantCode,
        String legalName,
        String brandName,
        String subscriptionPlan
    ) {
        try {
            List<ProvisionTenantResult> results = jdbcTemplate.query(
                """
                    select new_tenant_id, new_schema_name, result_status
                    from platform.fn_provision_tenant(?, ?, ?, ?, ?, ?, ?)
                    """,
                (rs, rowNum) -> new ProvisionTenantResult(
                    rs.getObject("new_tenant_id", UUID.class),
                    rs.getString("new_schema_name"),
                    rs.getString("result_status")
                ),
                tenantCode,
                legalName,
                brandName,
                null,
                null,
                subscriptionPlan,
                DISPLAY_ZONE_ID.getId()
            );

            if (results.isEmpty()) {
                throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Tenant provision function returned no result"
                );
            }
            return results.get(0);
        } catch (DataAccessException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tenant provisioning failed", ex);
        }
    }

    private String buildTenantSchemaName(String tenantCode) {
        return "tenant_" + tenantCode;
    }

    private String nextTenantCodeFromDatabase() {
        try {
            String tenantCode = jdbcTemplate.queryForObject("select platform.fn_next_tenant_code()", String.class);
            if (tenantCode == null || tenantCode.isBlank()) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot generate tenantCode");
            }
            return normalizeSqlIdentifier(tenantCode, "Generated tenantCode is invalid");
        } catch (DataAccessException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot generate tenantCode", ex);
        }
    }

    private Account loadAccount(UUID accountId) {
        return accountRepository.findById(accountId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    private Tenant loadTenantByCode(String tenantCode) {
        return tenantRepository.findByTenantCodeIgnoreCase(tenantCode)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found"));
    }

    private Role loadRoleByKey(String roleKey) {
        String normalized = normalizeRoleKey(roleKey);
        return roleRepository.findByRoleKeyIgnoreCase(normalized)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
    }

    private RolePermissionSummaryResponse buildRoleSummary(Role role) {
        Map<String, List<String>> permissionKeysByRoleKey = queryPermissionKeysByRoleKey();
        return new RolePermissionSummaryResponse(
            role.getRoleKey(),
            role.getRoleName(),
            resolveRoleScope(role),
            permissionKeysByRoleKey.getOrDefault(role.getRoleKey(), List.of())
        );
    }

    private Map<String, List<String>> queryPermissionKeysByRoleKey() {
        try {
            Map<String, List<String>> result = new HashMap<>();
            jdbcTemplate.query(
                """
                    select r.role_key as role_key, p.permission_key as permission_key
                    from platform.role_permissions rp
                    join platform.roles r on r.id = rp.role_id
                    join platform.permissions p on p.id = rp.permission_id
                    order by r.role_scope, r.sort_order, r.role_key, p.permission_key
                    """,
                rs -> {
                    String roleKey = rs.getString("role_key");
                    if (roleKey == null) {
                        return;
                    }
                    String permissionKey = rs.getString("permission_key");
                    result.computeIfAbsent(roleKey, ignored -> new ArrayList<>()).add(permissionKey);
                }
            );
            return result;
        } catch (DataAccessException | IllegalArgumentException ex) {
            return Map.of();
        }
    }

    private void replaceRolePermissions(Role role, List<String> permissionKeysInput) {
        List<Permission> permissions = resolvePermissions(permissionKeysInput);

        jdbcTemplate.update("delete from platform.role_permissions where role_id = ?", role.getId());
        if (permissions.isEmpty()) {
            return;
        }

        jdbcTemplate.batchUpdate(
            """
                insert into platform.role_permissions (id, role_id, permission_id, created_at, updated_at)
                values (gen_random_uuid(), ?, ?, now(), now())
                """,
            new BatchPreparedStatementSetter() {
                @Override
                public void setValues(java.sql.PreparedStatement ps, int index) throws java.sql.SQLException {
                    Permission permission = permissions.get(index);
                    ps.setObject(1, role.getId());
                    ps.setObject(2, permission.getId());
                }

                @Override
                public int getBatchSize() {
                    return permissions.size();
                }
            }
        );
    }

    private List<Permission> resolvePermissions(List<String> permissionKeysInput) {
        List<String> permissionKeys = normalizePermissionKeys(permissionKeysInput);
        if (permissionKeys.isEmpty()) {
            return List.of();
        }

        List<Permission> permissions = permissionRepository.findByPermissionKeyIn(permissionKeys);
        Set<String> foundPermissionKeys = permissions.stream().map(Permission::getPermissionKey).collect(Collectors.toSet());

        List<String> missing = permissionKeys.stream()
            .filter(permissionKey -> !foundPermissionKeys.contains(permissionKey))
            .toList();
        if (!missing.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown permission keys: " + String.join(",", missing));
        }
        Map<String, Permission> permissionByKey = new HashMap<>();
        for (Permission permission : permissions) {
            permissionByKey.put(permission.getPermissionKey(), permission);
        }
        List<Permission> orderedPermissions = new ArrayList<>();
        for (String permissionKey : permissionKeys) {
            orderedPermissions.add(permissionByKey.get(permissionKey));
        }
        return orderedPermissions;
    }

    private List<String> normalizePermissionKeys(List<String> permissionKeysInput) {
        if (permissionKeysInput == null) {
            return List.of();
        }
        LinkedHashSet<String> result = new LinkedHashSet<>();
        for (String permissionKey : permissionKeysInput) {
            if (permissionKey == null || permissionKey.isBlank()) {
                continue;
            }
            result.add(permissionKey.trim().toLowerCase(Locale.ROOT));
        }
        return result.stream().toList();
    }

    private String normalizeRoleKey(String roleKey) {
        String value = requireNonBlank(roleKey, "roleKey is required").toUpperCase(Locale.ROOT);
        if (!ROLE_KEY_PATTERN.matcher(value).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid roleKey format");
        }
        return value;
    }

    private String normalizeRoleScope(String roleScope) {
        String value = requireNonBlank(roleScope, "roleScope is required").toLowerCase(Locale.ROOT);
        if (!ROLE_SCOPES.contains(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "roleScope must be platform or tenant");
        }
        return value;
    }

    private void validateRoleScope(String roleKey, String roleScope) {
        boolean platformRole = isPlatformRoleKey(roleKey);
        if ("platform".equals(roleScope) && !platformRole) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Platform roleKey must start with PLATFORM_");
        }
        if ("tenant".equals(roleScope) && platformRole) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tenant roleKey must not start with PLATFORM_");
        }
    }

    private String resolveRoleScope(Role role) {
        if (role.getRoleScope() != null && !role.getRoleScope().isBlank()) {
            return role.getRoleScope().trim().toLowerCase(Locale.ROOT);
        }
        return isPlatformRoleKey(role.getRoleKey()) ? "platform" : "tenant";
    }

    private boolean isPlatformRoleKey(String roleKey) {
        return roleKey != null && roleKey.toUpperCase(Locale.ROOT).startsWith(PLATFORM_ROLE_PREFIX);
    }

    private Sort roleSort() {
        return Sort.by(
            Sort.Order.asc("roleScope"),
            Sort.Order.asc("sortOrder"),
            Sort.Order.asc("roleKey")
        );
    }

    private String normalizeTenantStatus(String status) {
        String value = requireNonBlank(status, "status is required").toLowerCase(Locale.ROOT);
        if (!TENANT_STATUSES.contains(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid tenant status");
        }
        return value;
    }

    private String normalizeSubscriptionPlan(String subscriptionPlan) {
        if (subscriptionPlan == null || subscriptionPlan.isBlank()) {
            return DEFAULT_SUBSCRIPTION_PLAN;
        }
        return subscriptionPlan.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeSqlIdentifier(String value, String requiredMessage) {
        String normalized = requireNonBlank(value, requiredMessage).toLowerCase(Locale.ROOT);
        if (!SQL_IDENTIFIER_PATTERN.matcher(normalized).matches()) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Only lowercase letters, digits, and underscore are allowed; must start with a letter"
            );
        }
        return normalized;
    }

    private String normalizeOptionalSqlIdentifier(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return normalizeSqlIdentifier(value, "Invalid identifier");
    }

    private String normalizeAccountStatus(String status) {
        String value = requireNonBlank(status, "status is required").toLowerCase(Locale.ROOT);
        if (!ACCOUNT_STATUSES.contains(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid account status");
        }
        return value;
    }

    private String normalizeAccessLevel(String accessLevel) {
        String value = requireNonBlank(accessLevel, "accessLevel is required").toLowerCase(Locale.ROOT);
        if (!ACCESS_LEVELS.contains(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid accessLevel");
        }
        return value;
    }

    private String normalizeAccessStatus(String status) {
        String value = requireNonBlank(status, "status is required").toLowerCase(Locale.ROOT);
        if (!ACCESS_STATUSES.contains(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid access status");
        }
        return value;
    }

    private String normalizeUsername(String username) {
        String value = requireNonBlank(username, "username is required");
        return value.toLowerCase(Locale.ROOT);
    }

    private String normalizeBranchCode(String branchCode) {
        return requireNonBlank(branchCode, "branchCode is required").toLowerCase(Locale.ROOT);
    }

    private String resolveTenantSourceSchema(Tenant tenant) {
        if (tenant.getSchemaName() != null && !tenant.getSchemaName().isBlank()) {
            return normalizeSqlIdentifier(tenant.getSchemaName(), "tenant schema is invalid");
        }

        String normalizedTenantCode = requireNonBlank(tenant.getTenantCode(), "tenantCode is required")
            .toLowerCase(Locale.ROOT)
            .replaceFirst("^tenant[_-]?", "");
        if (normalizedTenantCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenant code is invalid for source schema");
        }
        return normalizeSqlIdentifier("tenant_" + normalizedTenantCode, "tenant code is invalid for source schema");
    }

    private void ensureCentralStoreExists(Tenant tenant) {
        if (tenantBranchRepository.findByTenantIdAndBranchCodeIgnoreCase(tenant.getId(), DEFAULT_CENTRAL_BRANCH_CODE).isPresent()) {
            return;
        }

        TenantBranch centralStore = new TenantBranch();
        centralStore.setTenantId(tenant.getId());
        centralStore.setBranchCode(DEFAULT_CENTRAL_BRANCH_CODE);
        centralStore.setBranchName(DEFAULT_CENTRAL_BRANCH_NAME);
        centralStore.setSourceSchemaName(resolveTenantSourceSchema(tenant));
        centralStore.setActive(true);

        try {
            tenantBranchRepository.save(centralStore);
        } catch (DataIntegrityViolationException ex) {
            if (tenantBranchRepository.findByTenantIdAndBranchCodeIgnoreCase(tenant.getId(), DEFAULT_CENTRAL_BRANCH_CODE).isPresent()) {
                return;
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot create default central store", ex);
        }
    }

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String requireNonBlank(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value.trim();
    }

    private int normalizeExtendMonths(Integer extendMonths) {
        int value = extendMonths == null ? 12 : extendMonths;
        if (value <= 0 || value > 36) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "extendMonths must be between 1 and 36");
        }
        return value;
    }

    private int normalizeValidDays(Integer validDays) {
        int value = validDays == null ? 7 : validDays;
        if (value <= 0 || value > 90) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "validDays must be between 1 and 90");
        }
        return value;
    }

    private String resolvePrimaryDomain(Tenant tenant) {
        String domain = normalizeNullable(tenant.getBrandName());
        if (domain != null) {
            return domain;
        }
        return tenant.getTenantCode();
    }

    private boolean matchesSearch(Tenant tenant, String query) {
        return (tenant.getTenantCode() != null && tenant.getTenantCode().toLowerCase(Locale.ROOT).contains(query))
            || (tenant.getLegalName() != null && tenant.getLegalName().toLowerCase(Locale.ROOT).contains(query))
            || (tenant.getBrandName() != null && tenant.getBrandName().toLowerCase(Locale.ROOT).contains(query));
    }

    private Set<String> normalizeRoles(List<String> actorRoles) {
        if (actorRoles == null || actorRoles.isEmpty()) {
            return Set.of();
        }
        Set<String> normalized = new HashSet<>();
        for (String role : actorRoles) {
            if (role == null || role.isBlank()) {
                continue;
            }
            normalized.add(role.trim().toUpperCase(Locale.ROOT));
        }
        return normalized;
    }

    private boolean hasAnyRole(Set<String> actorRoles, Set<String> requiredRoles) {
        for (String required : requiredRoles) {
            if (actorRoles.contains(required)) {
                return true;
            }
        }
        return false;
    }

    private Tenant ensureTenantExpiry(Tenant tenant) {
        if (tenant.getSubscriptionExpiresAt() != null) {
            return tenant;
        }
        Instant defaultExpiry = "trial".equalsIgnoreCase(tenant.getStatus())
            ? Instant.now().plus(Duration.ofDays(30))
            : Instant.now().plus(Duration.ofDays(365));
        tenant.setSubscriptionExpiresAt(defaultExpiry);
        return tenantRepository.save(tenant);
    }

    private Instant calculateNewExpiry(Instant currentExpiry, int extendMonths) {
        Instant base = currentExpiry;
        Instant now = Instant.now();
        if (base == null || base.isBefore(now)) {
            base = now;
        }
        return base.atZone(DISPLAY_ZONE_ID).plusMonths(extendMonths).toInstant();
    }

    private RenewalKeyRow loadRenewalKeyForUpdate(String keyCode) {
        List<RenewalKeyRow> rows = jdbcTemplate.query(
            """
                select id, tenant_id, extend_months, status, expires_at
                from platform.renewal_keys
                where key_code = ?
                for update
                """,
            (rs, rowNum) -> new RenewalKeyRow(
                rs.getObject("id", UUID.class),
                rs.getObject("tenant_id", UUID.class),
                rs.getInt("extend_months"),
                rs.getString("status"),
                rs.getTimestamp("expires_at").toInstant()
            ),
            keyCode
        );
        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "renewalKey is invalid");
        }
        return rows.get(0);
    }

    private void validateRenewalKeyForTenant(RenewalKeyRow keyRow, UUID tenantId) {
        if (!tenantId.equals(keyRow.tenantId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "renewalKey is not for this tenant");
        }
        if (!"active".equalsIgnoreCase(keyRow.status())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "renewalKey is no longer active");
        }
        if (keyRow.expiresAt().isBefore(Instant.now())) {
            jdbcTemplate.update(
                "update platform.renewal_keys set status = 'expired', updated_at = now() where id = ?",
                keyRow.id()
            );
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "renewalKey is expired");
        }
    }

    private void consumeRenewalKey(UUID renewalKeyId, UUID usedByAccountId) {
        jdbcTemplate.update(
            """
                update platform.renewal_keys
                set status = 'used', used_by = ?, used_at = now(), updated_at = now()
                where id = ?
                """,
            usedByAccountId,
            renewalKeyId
        );
    }

    private void markExpiredRenewalKeys() {
        jdbcTemplate.update(
            """
                update platform.renewal_keys
                set status = 'expired', updated_at = now()
                where status = 'active' and expires_at < now()
                """
        );
    }

    private ResponsibleContact resolveResponsibleForTenant(UUID tenantId) {
        List<AccountTenant> tenantAccessRows = accountTenantRepository.findByTenantId(tenantId);
        List<UUID> accountIds = tenantAccessRows.stream().map(AccountTenant::getAccountId).distinct().toList();
        Map<UUID, Account> accountById = new HashMap<>();
        if (!accountIds.isEmpty()) {
            for (Account account : accountRepository.findAllById(accountIds)) {
                accountById.put(account.getId(), account);
            }
        }
        return resolveResponsible(tenantAccessRows, accountById);
    }

    private String createUniqueRenewalKeyCode() {
        for (int attempt = 0; attempt < 5; attempt++) {
            String candidate = "RK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
            Integer count = jdbcTemplate.queryForObject(
                "select count(1) from platform.renewal_keys where key_code = ?",
                Integer.class,
                candidate
            );
            if (count != null && count == 0) {
                return candidate;
            }
        }
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot generate renewal key");
    }

    private StoreSummaryResponse toStoreSummary(TenantBranch store, Tenant tenant, ResponsibleContact responsible) {
        return new StoreSummaryResponse(
            store.getId(),
            tenant.getTenantCode(),
            store.getBranchCode(),
            store.getBranchName(),
            store.getSourceSchemaName(),
            store.isActive(),
            tenant.getSubscriptionPlan(),
            tenant.getSubscriptionExpiresAt(),
            tenant.getStatus(),
            responsible.username(),
            responsible.fullName()
        );
    }

    private CrmAnalyticsResponse buildAnalyticsFallback() {
        List<Tenant> tenants = tenantRepository.findAll();

        int activeTenants = (int) tenants.stream().filter(tenant -> "active".equalsIgnoreCase(tenant.getStatus())).count();
        int trialTenants = (int) tenants.stream().filter(tenant -> "trial".equalsIgnoreCase(tenant.getStatus())).count();
        int suspendedTenants = (int) tenants.stream().filter(tenant -> "suspended".equalsIgnoreCase(tenant.getStatus())).count();
        long estimatedRevenue = tenants.stream().mapToLong(tenant -> estimateSubscriptionAmount(tenant.getSubscriptionPlan())).sum();

        int totalStores = (int) tenantBranchRepository.count();
        List<Account> accounts = accountRepository.findAll();
        int totalAccounts = accounts.size();
        int totalPlatformAdmins = (int) accounts.stream().filter(Account::isPlatformAdmin).count();

        CrmAnalyticsResponse.DashboardSummary dashboard = new CrmAnalyticsResponse.DashboardSummary(
            activeTenants,
            trialTenants,
            suspendedTenants,
            tenants.size(),
            totalStores,
            totalAccounts,
            totalPlatformAdmins,
            estimatedRevenue
        );

        return new CrmAnalyticsResponse(
            dashboard,
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of(),
            List.of()
        );
    }

    private long estimateSubscriptionAmount(String subscriptionPlan) {
        if (subscriptionPlan == null) {
            return 0L;
        }
        return switch (subscriptionPlan.toLowerCase(Locale.ROOT)) {
            case "standard" -> 250000L;
            case "pro" -> 500000L;
            case "enterprise" -> 1200000L;
            default -> 0L;
        };
    }

    private int toInt(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        return 0;
    }

    private long toLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return 0L;
    }

    private Instant readInstant(Timestamp timestamp) throws SQLException {
        if (timestamp == null) {
            return null;
        }
        return timestamp.toInstant();
    }

    private String formatRelativeTime(Instant eventTime) {
        if (eventTime == null) {
            return "Khong ro";
        }
        Duration duration = Duration.between(eventTime, Instant.now());
        if (duration.isNegative() || duration.toSeconds() < 60) {
            return "Vua xong";
        }
        if (duration.toMinutes() < 60) {
            return duration.toMinutes() + " phut truoc";
        }
        if (duration.toHours() < 24) {
            return duration.toHours() + " gio truoc";
        }
        if (duration.toDays() < 30) {
            return duration.toDays() + " ngay truoc";
        }
        return DISPLAY_TIME_FORMATTER.format(eventTime);
    }

    private String toTicketLevel(String severity) {
        if (severity == null) {
            return "Medium";
        }
        return switch (severity.toLowerCase(Locale.ROOT)) {
            case "critical", "high" -> "High";
            case "warning", "medium" -> "Medium";
            default -> "Low";
        };
    }

    private record ResponsibleContact(UUID accountId, String username, String fullName) {
        private static final ResponsibleContact EMPTY = new ResponsibleContact(null, null, null);
    }

    private record ProvisionTenantResult(UUID tenantId, String schemaName, String status) {
    }

    private record RenewalKeyRow(UUID id, UUID tenantId, int extendMonths, String status, Instant expiresAt) {
    }
}
