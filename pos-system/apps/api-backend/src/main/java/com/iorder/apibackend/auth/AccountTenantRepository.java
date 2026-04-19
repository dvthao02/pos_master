package com.iorder.apibackend.auth;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountTenantRepository extends JpaRepository<AccountTenant, UUID> {
    Optional<AccountTenant> findByAccountIdAndTenantId(UUID accountId, UUID tenantId);
    List<AccountTenant> findByTenantId(UUID tenantId);
    List<AccountTenant> findByTenantIdIn(List<UUID> tenantIds);

    @Query(
        value = """
            select at.tenant_id as tenantId,
                   t.tenant_code as tenantCode,
                   at.access_level as accessLevel,
                   at.status as status,
                   at.default_branch_code as defaultBranchCode
            from platform.account_tenants at
            join platform.tenants t on t.id = at.tenant_id
            where at.account_id = :accountId
            order by t.tenant_code
            """,
        nativeQuery = true
    )
    List<AccountTenantAccessRow> findTenantAccessRows(@Param("accountId") UUID accountId);

    @Modifying
    @Query(
        value = """
            delete from platform.account_tenants
            where account_id = :accountId
            """,
        nativeQuery = true
    )
    void deleteByAccountId(@Param("accountId") UUID accountId);

    @Modifying
    @Query(
        value = """
            delete from platform.account_tenants
            where account_id = :accountId
              and tenant_id = :tenantId
            """,
        nativeQuery = true
    )
    void deleteByAccountIdAndTenantId(@Param("accountId") UUID accountId, @Param("tenantId") UUID tenantId);

    interface AccountTenantAccessRow {
        UUID getTenantId();
        String getTenantCode();
        String getAccessLevel();
        String getStatus();
        String getDefaultBranchCode();
    }
}
