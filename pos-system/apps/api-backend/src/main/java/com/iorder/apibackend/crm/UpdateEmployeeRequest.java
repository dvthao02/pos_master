package com.iorder.apibackend.crm;

public record UpdateEmployeeRequest(
    String fullName,
    String email,
    String phone,
    String status,
    boolean platformAdmin
) {
}
