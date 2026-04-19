package com.iorder.apibackend.crm;

import java.util.UUID;
import java.time.Instant;

public record TenantSchemaSummaryResponse(
    UUID tenantId,
    String tenantCode,
    String schemaName,
    String legalName,
    String brandName,
    String subscriptionPlan,
    String status,
    Instant createdAt,
    Instant subscriptionExpiresAt,
    String responsibleAccountId,
    String responsibleUsername,
    String responsibleFullName,
    long storeCount
) {
}
