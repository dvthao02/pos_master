package com.iorder.apibackend.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "account_tenants", schema = "platform")
public class AccountTenant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "access_level", nullable = false, length = 50)
    private String accessLevel;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "default_branch_code", length = 100)
    private String defaultBranchCode;

    public UUID getId() {
        return id;
    }

    public UUID getAccountId() {
        return accountId;
    }

    public UUID getTenantId() {
        return tenantId;
    }

    public String getAccessLevel() {
        return accessLevel;
    }

    public String getStatus() {
        return status;
    }

    public String getDefaultBranchCode() {
        return defaultBranchCode;
    }

    public void setAccountId(UUID accountId) {
        this.accountId = accountId;
    }

    public void setTenantId(UUID tenantId) {
        this.tenantId = tenantId;
    }

    public void setAccessLevel(String accessLevel) {
        this.accessLevel = accessLevel;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setDefaultBranchCode(String defaultBranchCode) {
        this.defaultBranchCode = defaultBranchCode;
    }
}
