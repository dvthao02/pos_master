package com.iorder.apibackend.crm;

public record UpdateStoreRequest(
    String branchName,
    String sourceSchemaName,
    Boolean active
) {
}
