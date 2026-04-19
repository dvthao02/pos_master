package com.iorder.apibackend.crm;

import java.time.Instant;

public record UpdateTenantPlanRequest(
    String subscriptionPlan,
    String note,
    Instant createdAt,
    Instant subscriptionExpiresAt
) {
}
