package com.iorder.apibackend.crm;

import java.util.List;

public record CrmBootstrapResponse(
    List<TenantItem> tenants,
    List<RoleItem> roles,
    List<PermissionItem> permissions
) {
    public record TenantItem(String tenantCode, String legalName, String status) {
    }

    public record RoleItem(String roleKey, String roleName) {
    }

    public record PermissionItem(String permissionKey, String permissionName, String moduleKey) {
    }
}
