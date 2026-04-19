package com.iorder.apibackend.auth;

import com.iorder.apibackend.platform.Tenant;
import com.iorder.apibackend.platform.TenantRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {
    private static final String STATUS_ACTIVE = "active";
    private static final String STATUS_TRIAL = "trial";

    private final AccountRepository accountRepository;
    private final AccountTenantRepository accountTenantRepository;
    private final AccountRoleBindingRepository accountRoleBindingRepository;
    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;

    public AuthService(
        AccountRepository accountRepository,
        AccountTenantRepository accountTenantRepository,
        AccountRoleBindingRepository accountRoleBindingRepository,
        TenantRepository tenantRepository,
        PasswordEncoder passwordEncoder,
        JwtTokenService jwtTokenService
    ) {
        this.accountRepository = accountRepository;
        this.accountTenantRepository = accountTenantRepository;
        this.accountRoleBindingRepository = accountRoleBindingRepository;
        this.tenantRepository = tenantRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
    }

    @Transactional
    public AuthTokenResponse loginPlatform(LoginRequest request) {
        Account account = loadAndVerifyAccount(request.username(), request.password());
        if (!account.isPlatformAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is not allowed for platform login");
        }

        List<String> roles = accountRoleBindingRepository.findPlatformRoleKeys(account.getId());
        if (roles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Platform role is missing");
        }

        accountRepository.updateLastLoginAt(account.getId(), Instant.now());
        return jwtTokenService.buildPlatformToken(account, roles);
    }

    @Transactional
    public AuthTokenResponse loginTenant(TenantLoginRequest request) {
        if (request.tenantCode() == null || request.tenantCode().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "tenantCode is required");
        }

        Account account = loadAndVerifyAccount(request.username(), request.password());

        Tenant tenant = tenantRepository.findByTenantCodeIgnoreCase(request.tenantCode())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found"));
        if (!isTenantAvailable(tenant.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tenant is not available for login");
        }

        AccountTenant accountTenant = accountTenantRepository.findByAccountIdAndTenantId(account.getId(), tenant.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Account has no access to this tenant"));
        if (!isActive(accountTenant.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tenant access is inactive");
        }

        List<String> roles = accountRoleBindingRepository.findTenantRoleKeys(account.getId(), tenant.getId());
        if (roles.isEmpty()) {
            roles = deriveTenantRolesFromAccessLevel(accountTenant.getAccessLevel());
        }
        if (roles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tenant role is missing");
        }

        accountRepository.updateLastLoginAt(account.getId(), Instant.now());
        return jwtTokenService.buildTenantToken(account, tenant, accountTenant, roles);
    }

    private Account loadAndVerifyAccount(String username, String password) {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username and password are required");
        }
        Account account = accountRepository.findByUsernameIgnoreCase(username)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!isActive(account.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is inactive");
        }
        if (!passwordEncoder.matches(password, account.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        return account;
    }

    private boolean isActive(String status) {
        return STATUS_ACTIVE.equalsIgnoreCase(status);
    }

    private boolean isTenantAvailable(String status) {
        return STATUS_ACTIVE.equalsIgnoreCase(status) || STATUS_TRIAL.equalsIgnoreCase(status);
    }

    private List<String> deriveTenantRolesFromAccessLevel(String accessLevel) {
        if (accessLevel == null || accessLevel.isBlank()) {
            return List.of();
        }
        return switch (accessLevel.trim().toLowerCase()) {
            case "owner" -> List.of("TENANT_OWNER");
            case "admin" -> List.of("TENANT_ADMIN");
            case "manager" -> List.of("STORE_MANAGER");
            case "cashier" -> List.of("CASHIER");
            case "inventory" -> List.of("INVENTORY");
            case "auditor" -> List.of("AUDITOR");
            case "staff" -> List.of("STORE_STAFF");
            case "api" -> List.of("STORE_ADMIN");
            default -> List.of();
        };
    }
}
