package com.iorder.apibackend.crm;

import java.time.Instant;
import java.util.UUID;

public record EnterpriseSummaryResponse(
    UUID tenantId,
    String tenantCode,
    String schemaName,
    String legalName,
    String primaryDomain,
    String subscriptionPlan,
    Instant createdAt,
    Instant subscriptionExpiresAt,
    String status,
    String responsibleAccountId,
    String responsibleUsername,
    String responsibleFullName,
    long storeCount
) {
}
