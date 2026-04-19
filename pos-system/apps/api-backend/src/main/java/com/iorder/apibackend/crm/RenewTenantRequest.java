package com.iorder.apibackend.crm;

public record RenewTenantRequest(
    Integer extendMonths,
    String renewalKey,
    String note
) {
}
