package com.iorder.apibackend.platform;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.UUID;

@Entity
@Table(name = "permissions", schema = "platform")
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "permission_key", nullable = false, unique = true, length = 120)
    private String permissionKey;

    @Column(name = "permission_name", nullable = false, length = 255)
    private String permissionName;

    @Column(name = "module_key", nullable = false, length = 80)
    private String moduleKey;

    public UUID getId() {
        return id;
    }

    public String getPermissionKey() {
        return permissionKey;
    }

    public String getPermissionName() {
        return permissionName;
    }

    public String getModuleKey() {
        return moduleKey;
    }
}
