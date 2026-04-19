package com.iorder.apibackend.platform;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "roles", schema = "platform")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "role_key", nullable = false, unique = true, length = 100)
    private String roleKey;

    @Column(name = "role_name", nullable = false, length = 255)
    private String roleName;

    @Column(name = "role_scope", nullable = false, length = 20)
    private String roleScope;

    @Column(name = "description")
    private String description;

    @Column(name = "is_system", nullable = false)
    private boolean system;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    public UUID getId() {
        return id;
    }

    public String getRoleKey() {
        return roleKey;
    }

    public String getRoleName() {
        return roleName;
    }

    public String getRoleScope() {
        return roleScope;
    }

    public String getDescription() {
        return description;
    }

    public boolean isSystem() {
        return system;
    }

    public int getSortOrder() {
        return sortOrder;
    }
}
