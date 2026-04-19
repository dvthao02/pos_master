package com.iorder.apibackend.crm;

import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/crm")
public class CrmAdminController {

    private final CrmAdminService crmAdminService;

    public CrmAdminController(CrmAdminService crmAdminService) {
        this.crmAdminService = crmAdminService;
    }

    @GetMapping("/bootstrap")
    public CrmBootstrapResponse bootstrap() {
        return crmAdminService.getBootstrap();
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN','PLATFORM_SUPPORT')")
    public CrmAnalyticsResponse analytics() {
        return crmAdminService.getAnalytics();
    }

    @GetMapping("/employees")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN','PLATFORM_SUPPORT')")
    public List<EmployeeSummaryResponse> employees() {
        return crmAdminService.getEmployees();
    }

    @GetMapping("/enterprises")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN','PLATFORM_SUPPORT','PLATFORM_BILLING','PLATFORM_SALES')")
    public List<EnterpriseSummaryResponse> enterprises(
        @RequestParam(required = false) String search,
        @RequestParam(required = false) String subscriptionPlan,
        @RequestParam(required = false) String status,
        @RequestParam(required = false) Integer expiringInDays
    ) {
        return crmAdminService.getEnterprises(search, subscriptionPlan, status, expiringInDays);
    }

    @PostMapping("/employees")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN')")
    public EmployeeSummaryResponse createEmployee(@RequestBody CreateEmployeeRequest request) {
        return crmAdminService.createEmployee(request);
    }

    @PutMapping("/employees/{accountId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN')")
    public EmployeeSummaryResponse updateEmployee(
        @PathVariable UUID accountId,
        @RequestBody UpdateEmployeeRequest request
    ) {
        return crmAdminService.updateEmployee(accountId, request);
    }

    @PutMapping("/employees/{accountId}/password")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN')")
    public EmployeeSummaryResponse updateEmployeePassword(
        @PathVariable UUID accountId,
        @RequestBody UpdateEmployeePasswordRequest request
    ) {
        return crmAdminService.updateEmployeePassword(accountId, request);
    }

    @PutMapping("/employees/{accountId}/platform-roles")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN')")
    public EmployeeSummaryResponse updatePlatformRoles(
        @PathVariable UUID accountId,
        @RequestBody UpdatePlatformRolesRequest request
    ) {
        return crmAdminService.updatePlatformRoles(accountId, request);
    }

    @PutMapping("/employees/{accountId}/tenant-access/{tenantCode}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN')")
    public EmployeeSummaryResponse upsertTenantAccess(
        @PathVariable UUID accountId,
        @PathVariable String tenantCode,
        @RequestBody UpsertTenantAccessRequest request
    ) {
        return crmAdminService.upsertTenantAccess(accountId, tenantCode, request);
    }

    @DeleteMapping("/employees/{accountId}/tenant-access/{tenantCode}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN')")
    public EmployeeSummaryResponse removeTenantAccess(
        @PathVariable UUID accountId,
        @PathVariable String tenantCode
    ) {
        return crmAdminService.removeTenantAccess(accountId, tenantCode);
    }

    @DeleteMapping("/employees/{accountId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN')")
    public EmployeeSummaryResponse disableEmployee(@PathVariable UUID accountId) {
        return crmAdminService.disableEmployee(accountId);
    }

    @GetMapping("/roles")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN','PLATFORM_SUPPORT')")
    public List<RolePermissionSummaryResponse> roles() {
        return crmAdminService.getRoles();
    }

    @PostMapping("/roles")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN')")
    public RolePermissionSummaryResponse createRole(@RequestBody CreateRoleRequest request) {
        return crmAdminService.createRole(request);
    }

    @PutMapping("/roles/{roleKey}/permissions")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN')")
    public RolePermissionSummaryResponse updateRolePermissions(
        @PathVariable String roleKey,
        @RequestBody UpdateRolePermissionsRequest request
    ) {
        return crmAdminService.updateRolePermissions(roleKey, request);
    }

    @DeleteMapping("/roles/{roleKey}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN')")
    public RolePermissionSummaryResponse deleteRole(@PathVariable String roleKey) {
        return crmAdminService.deleteRole(roleKey);
    }

    @GetMapping("/stores")
    public List<StoreSummaryResponse> stores(@RequestParam String tenantCode) {
        return crmAdminService.getStores(tenantCode);
    }

    @PostMapping("/stores")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN','PLATFORM_STORE_CREATOR')")
    public StoreSummaryResponse createStore(@RequestBody CreateStoreRequest request) {
        return crmAdminService.createStore(request);
    }

    @PutMapping("/stores/{storeId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN')")
    public StoreSummaryResponse updateStore(
        @PathVariable UUID storeId,
        @RequestBody UpdateStoreRequest request
    ) {
        return crmAdminService.updateStore(storeId, request);
    }

    @DeleteMapping("/stores/{storeId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN')")
    public StoreSummaryResponse disableStore(@PathVariable UUID storeId) {
        return crmAdminService.disableStore(storeId);
    }

    @GetMapping("/tenant-schemas")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN','PLATFORM_SUPPORT')")
    public List<TenantSchemaSummaryResponse> tenantSchemas() {
        return crmAdminService.getTenantSchemas();
    }

    @PostMapping("/tenant-schemas")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN')")
    public TenantSchemaSummaryResponse createTenantSchema(@RequestBody CreateTenantSchemaRequest request) {
        return crmAdminService.createTenantSchema(request);
    }

    @PutMapping("/tenant-schemas/{tenantCode}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN')")
    public TenantSchemaSummaryResponse updateTenantSchema(
        @PathVariable String tenantCode,
        @RequestBody UpdateTenantSchemaRequest request
    ) {
        return crmAdminService.updateTenantSchema(tenantCode, request);
    }

    @PutMapping("/tenant-schemas/{tenantCode}/subscription-plan")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN','PLATFORM_BILLING')")
    public TenantSchemaSummaryResponse updateTenantSubscriptionPlan(
        @PathVariable String tenantCode,
        @RequestBody UpdateTenantPlanRequest request,
        Authentication authentication
    ) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return crmAdminService.updateTenantSubscriptionPlan(
            tenantCode,
            request,
            jwt.getClaimAsStringList("roles")
        );
    }

    @PostMapping("/tenant-schemas/{tenantCode}/renewal-keys")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN','PLATFORM_BILLING')")
    public RenewalKeyResponse createRenewalKey(
        @PathVariable String tenantCode,
        @RequestBody CreateRenewalKeyRequest request,
        Authentication authentication
    ) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String accountId = jwt.getClaimAsString("accountId");
        if (accountId == null || accountId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing accountId in token");
        }
        return crmAdminService.createRenewalKey(tenantCode, request, UUID.fromString(accountId));
    }

    @PutMapping("/tenant-schemas/{tenantCode}/renew")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','PLATFORM_ADMIN','PLATFORM_BILLING','PLATFORM_SALES','PLATFORM_SUPPORT')")
    public TenantSchemaSummaryResponse renewTenantSchema(
        @PathVariable String tenantCode,
        @RequestBody RenewTenantRequest request,
        Authentication authentication
    ) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        String accountId = jwt.getClaimAsString("accountId");
        if (accountId == null || accountId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing accountId in token");
        }
        return crmAdminService.renewTenantSchema(
            tenantCode,
            request,
            UUID.fromString(accountId),
            jwt.getClaimAsStringList("roles")
        );
    }
}
