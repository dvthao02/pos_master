package com.iorder.apibackend.crm;

import java.util.List;

public record UpdateRolePermissionsRequest(List<String> permissionKeys) {
}
