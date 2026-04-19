package com.iorder.apibackend.auth;

import java.util.List;

public record AuthTokenResponse(
    String accessToken,
    String tokenType,
    long expiresInSeconds,
    String loginZone,
    String tenantCode,
    String username,
    String fullName,
    String accessLevel,
    List<String> roles
) {
}
