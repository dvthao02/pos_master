package com.iorder.apibackend.crm;

public record CreateRenewalKeyRequest(
    Integer extendMonths,
    Integer validDays,
    String note
) {
}
