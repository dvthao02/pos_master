package com.iorder.apibackend.auth;

import com.iorder.apibackend.platform.Tenant;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

@Service
public class JwtTokenService {

    private final JwtEncoder jwtEncoder;
    private final String issuer;
    private final long platformTokenMinutes;
    private final long tenantTokenMinutes;

    public JwtTokenService(
        JwtEncoder jwtEncoder,
        @Value("${app.security.jwt.issuer:iorder-api}") String issuer,
        @Value("${app.security.jwt.platform-token-minutes:120}") long platformTokenMinutes,
        @Value("${app.security.jwt.tenant-token-minutes:480}") long tenantTokenMinutes
    ) {
        this.jwtEncoder = jwtEncoder;
        this.issuer = issuer;
        this.platformTokenMinutes = platformTokenMinutes;
        this.tenantTokenMinutes = tenantTokenMinutes;
    }

    public AuthTokenResponse buildPlatformToken(Account account, List<String> roles) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(platformTokenMinutes, ChronoUnit.MINUTES);
        String token = encode(
            account,
            "platform",
            "platform",
            null,
            roles,
            now,
            expiresAt
        );
        return new AuthTokenResponse(
            token,
            "Bearer",
            platformTokenMinutes * 60,
            "platform",
            "platform",
            account.getUsername(),
            account.getFullName(),
            null,
            roles
        );
    }

    public AuthTokenResponse buildTenantToken(
        Account account,
        Tenant tenant,
        AccountTenant accountTenant,
        List<String> roles
    ) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(tenantTokenMinutes, ChronoUnit.MINUTES);
        String token = encode(
            account,
            "tenant",
            tenant.getTenantCode(),
            accountTenant.getAccessLevel(),
            roles,
            now,
            expiresAt
        );
        return new AuthTokenResponse(
            token,
            "Bearer",
            tenantTokenMinutes * 60,
            "tenant",
            tenant.getTenantCode(),
            account.getUsername(),
            account.getFullName(),
            accountTenant.getAccessLevel(),
            roles
        );
    }

    private String encode(
        Account account,
        String loginZone,
        String tenantCode,
        String accessLevel,
        List<String> roles,
        Instant issuedAt,
        Instant expiresAt
    ) {
        JwtClaimsSet.Builder claimsBuilder = JwtClaimsSet.builder()
            .issuer(issuer)
            .issuedAt(issuedAt)
            .expiresAt(expiresAt)
            .subject(account.getUsername())
            .claim("accountId", account.getId().toString())
            .claim("tenantCode", tenantCode)
            .claim("loginZone", loginZone)
            .claim("roles", roles);

        if (accessLevel != null && !accessLevel.isBlank()) {
            claimsBuilder.claim("accessLevel", accessLevel);
        }

        JwtEncoderParameters params = JwtEncoderParameters.from(
            JwsHeader.with(MacAlgorithm.HS256).build(),
            claimsBuilder.build()
        );
        return jwtEncoder.encode(params).getTokenValue();
    }
}
