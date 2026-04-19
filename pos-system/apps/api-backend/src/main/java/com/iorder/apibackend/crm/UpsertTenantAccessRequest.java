package com.iorder.apibackend.crm;

import java.util.List;

public record UpsertTenantAccessRequest(
    String accessLevel,
    String status,
    String defaultBranchCode,
    List<String> roleKeys
) {
}
