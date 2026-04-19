package com.iorder.apibackend.crm;

public record CreateStoreRequest(
    String tenantCode,
    String branchCode,
    String branchName,
    String sourceSchemaName
) {
}
