package com.iorder.apibackend.crm;

import java.util.List;

public record CreateEmployeeRequest(
    String username,
    String password,
    String fullName,
    String email,
    String phone,
    String status,
    boolean platformAdmin,
    List<String> platformRoleKeys
) {
}
