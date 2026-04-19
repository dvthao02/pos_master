package com.iorder.apibackend.crm;

import java.util.UUID;

public record CreateTenantSchemaRequest(
    String tenantCode,
    String schemaName,
    String legalName,
    String brandName,
    String subscriptionPlan,
    String status,
    UUID responsibleAccountId
) {
}
