package com.iorder.apibackend.multitenancy;

public final class TenantContextHolder {
    private static final ThreadLocal<String> TENANT_CONTEXT = new ThreadLocal<>();

    private TenantContextHolder() {
    }

    public static void setTenant(String tenantCode) {
        TENANT_CONTEXT.set(tenantCode);
    }

    public static String getTenant() {
        return TENANT_CONTEXT.get();
    }

    public static void clear() {
        TENANT_CONTEXT.remove();
    }
}
