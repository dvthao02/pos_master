package com.iorder.apibackend.auth;

public record TenantLoginRequest(String username, String password, String tenantCode) {
}
