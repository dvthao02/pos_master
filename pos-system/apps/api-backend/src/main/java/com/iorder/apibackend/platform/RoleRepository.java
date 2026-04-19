package com.iorder.apibackend.platform;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, UUID> {
    List<Role> findByRoleKeyIn(Collection<String> roleKeys);
    Optional<Role> findByRoleKey(String roleKey);
    Optional<Role> findByRoleKeyIgnoreCase(String roleKey);
    boolean existsByRoleKeyIgnoreCase(String roleKey);
    List<Role> findAllByOrderByRoleKeyAsc();
}
