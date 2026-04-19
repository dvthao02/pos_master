package com.iorder.apibackend.crm;

import java.util.List;

public record RolePermissionSummaryResponse(
    String roleKey,
    String roleName,
    String roleScope,
    List<String> permissionKeys
) {
}
