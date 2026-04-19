package com.iorder.apibackend.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AccountRepository extends JpaRepository<Account, UUID> {
    Optional<Account> findByUsernameIgnoreCase(String username);
    boolean existsByUsernameIgnoreCase(String username);

    @Modifying
    @Query("update Account a set a.lastLoginAt = :lastLoginAt where a.id = :id")
    void updateLastLoginAt(@Param("id") UUID id, @Param("lastLoginAt") Instant lastLoginAt);
}
