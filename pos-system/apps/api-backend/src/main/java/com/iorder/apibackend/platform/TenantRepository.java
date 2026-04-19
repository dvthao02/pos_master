package com.iorder.apibackend.platform;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TenantRepository extends JpaRepository<Tenant, UUID> {
    Optional<Tenant> findByTenantCodeIgnoreCase(String tenantCode);
    boolean existsByTenantCodeIgnoreCase(String tenantCode);
    boolean existsBySchemaNameIgnoreCase(String schemaName);
}
