package com.iorder.apibackend.auth;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountRoleBindingRepository extends JpaRepository<AccountRoleBinding, UUID> {

    @Query(
        value = """
            select r.role_key
            from platform.account_role_bindings arb
            join platform.roles r on r.id = arb.role_id
            where arb.account_id = :accountId
              and arb.scope_type = 'platform'
            order by r.role_key
            """,
        nativeQuery = true
    )
    List<String> findPlatformRoleKeys(@Param("accountId") UUID accountId);

    @Query(
        value = """
            select r.role_key
            from platform.account_role_bindings arb
            join platform.roles r on r.id = arb.role_id
            where arb.account_id = :accountId
              and arb.scope_type = 'tenant'
              and arb.scope_id = :tenantId
            order by r.role_key
            """,
        nativeQuery = true
    )
    List<String> findTenantRoleKeys(@Param("accountId") UUID accountId, @Param("tenantId") UUID tenantId);

    @Modifying
    @Query(
        value = """
            delete from platform.account_role_bindings
            where account_id = :accountId
              and scope_type = 'platform'
            """,
        nativeQuery = true
    )
    void deletePlatformRoles(@Param("accountId") UUID accountId);

    @Modifying
    @Query(
        value = """
            delete from platform.account_role_bindings
            where account_id = :accountId
              and scope_type = 'tenant'
              and scope_id = :tenantId
            """,
        nativeQuery = true
    )
    void deleteTenantRoles(@Param("accountId") UUID accountId, @Param("tenantId") UUID tenantId);

    @Modifying
    @Query(
        value = """
            delete from platform.account_role_bindings
            where account_id = :accountId
            """,
        nativeQuery = true
    )
    void deleteAllRolesByAccountId(@Param("accountId") UUID accountId);

    @Query(
        value = """
            select count(1)
            from platform.account_role_bindings
            where role_id = :roleId
            """,
        nativeQuery = true
    )
    long countBindingsByRoleId(@Param("roleId") UUID roleId);

    @Modifying
    @Query(
        value = """
            insert into platform.account_role_bindings
                (id, account_id, role_id, scope_type, scope_id, created_at, updated_at)
            values
                (gen_random_uuid(), :accountId, :roleId, 'platform', null, now(), now())
            """,
        nativeQuery = true
    )
    void insertPlatformRole(@Param("accountId") UUID accountId, @Param("roleId") UUID roleId);

    @Modifying
    @Query(
        value = """
            insert into platform.account_role_bindings
                (id, account_id, role_id, scope_type, scope_id, created_at, updated_at)
            values
                (gen_random_uuid(), :accountId, :roleId, 'tenant', :tenantId, now(), now())
            """,
        nativeQuery = true
    )
    void insertTenantRole(
        @Param("accountId") UUID accountId,
        @Param("roleId") UUID roleId,
        @Param("tenantId") UUID tenantId
    );
}
