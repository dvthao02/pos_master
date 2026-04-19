package com.iorder.apibackend.crm;

import java.time.Instant;
import java.util.UUID;

public record StoreSummaryResponse(
    UUID id,
    String tenantCode,
    String branchCode,
    String branchName,
    String sourceSchemaName,
    boolean active,
    String subscriptionPlan,
    Instant subscriptionExpiresAt,
    String tenantStatus,
    String responsibleUsername,
    String responsibleFullName
) {
}
