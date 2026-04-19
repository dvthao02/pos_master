package com.iorder.apibackend.auth;

import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/platform/login")
    public AuthTokenResponse platformLogin(@RequestBody LoginRequest request) {
        return authService.loginPlatform(request);
    }

    @PostMapping("/tenant/login")
    public AuthTokenResponse tenantLogin(@RequestBody TenantLoginRequest request) {
        return authService.loginTenant(request);
    }

    @GetMapping("/me")
    public Map<String, Object> me(Authentication authentication) {
        Jwt jwt = (Jwt) authentication.getPrincipal();
        return Map.of(
            "username",
            jwt.getSubject(),
            "tenantCode",
            jwt.getClaimAsString("tenantCode"),
            "loginZone",
            jwt.getClaimAsString("loginZone"),
            "roles",
            jwt.getClaimAsStringList("roles")
        );
    }
}
