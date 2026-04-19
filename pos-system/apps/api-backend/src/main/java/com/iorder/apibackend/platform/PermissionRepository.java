package com.iorder.apibackend.platform;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    List<Permission> findAllByOrderByModuleKeyAscPermissionKeyAsc();
    List<Permission> findByPermissionKeyIn(Collection<String> permissionKeys);
}
