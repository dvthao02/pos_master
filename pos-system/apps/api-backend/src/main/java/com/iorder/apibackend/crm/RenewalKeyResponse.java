package com.iorder.apibackend.crm;

import java.time.Instant;

public record RenewalKeyResponse(
    String keyCode,
    String tenantCode,
    int extendMonths,
    String status,
    Instant expiresAt,
    Instant usedAt
) {
}
