package com.iorder.apibackend.crm;

import java.util.List;
import java.util.UUID;

public record EmployeeSummaryResponse(
    UUID id,
    String username,
    String fullName,
    String email,
    String phone,
    String status,
    boolean platformAdmin,
    List<String> platformRoles,
    List<TenantAccessItem> tenantAccesses
) {
    public record TenantAccessItem(
        String tenantCode,
        String accessLevel,
        String status,
        String defaultBranchCode,
        List<String> roles
    ) {
    }
}
