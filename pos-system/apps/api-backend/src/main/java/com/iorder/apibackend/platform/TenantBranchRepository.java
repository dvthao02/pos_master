package com.iorder.apibackend.platform;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TenantBranchRepository extends JpaRepository<TenantBranch, UUID> {
    List<TenantBranch> findByTenantIdOrderByBranchCodeAsc(UUID tenantId);
    Optional<TenantBranch> findByTenantIdAndBranchCodeIgnoreCase(UUID tenantId, String branchCode);

    @Query(
        value = """
            select tb.tenantId as tenantId, count(tb) as totalStores
            from TenantBranch tb
            where tb.tenantId in :tenantIds
            group by tb.tenantId
            """
    )
    List<TenantStoreCountRow> countStoresByTenantIds(@Param("tenantIds") List<UUID> tenantIds);

    interface TenantStoreCountRow {
        UUID getTenantId();
        long getTotalStores();
    }
}
