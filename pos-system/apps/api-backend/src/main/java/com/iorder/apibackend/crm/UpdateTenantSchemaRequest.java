package com.iorder.apibackend.crm;

import java.time.Instant;
import java.util.UUID;

public record UpdateTenantSchemaRequest(
    String legalName,
    String brandName,
    String subscriptionPlan,
    String status,
    UUID responsibleAccountId,
    Instant createdAt,
    Instant subscriptionExpiresAt
) {
}
