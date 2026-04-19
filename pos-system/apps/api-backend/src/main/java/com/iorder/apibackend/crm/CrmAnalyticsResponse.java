package com.iorder.apibackend.crm;

import java.util.List;

public record CrmAnalyticsResponse(
    DashboardSummary dashboard,
    List<SeriesPoint> tenantGrowthSeries,
    List<SeriesPoint> loginUsageSeries,
    List<NotificationItem> notifications,
    List<SupportTicketItem> supportTickets,
    List<ActivityItem> recentActivities,
    List<AuditEventItem> auditEvents,
    List<SuspiciousSessionItem> suspiciousSessions
) {
    public record DashboardSummary(
        int activeTenants,
        int trialTenants,
        int suspendedTenants,
        int totalTenants,
        int totalStores,
        int totalAccounts,
        int totalPlatformAdmins,
        long estimatedRevenue
    ) {
    }

    public record SeriesPoint(String label, int value) {
    }

    public record NotificationItem(String title, String target, String time) {
    }

    public record SupportTicketItem(String tenant, String title, String level, String status) {
    }

    public record ActivityItem(String title, String time) {
    }

    public record AuditEventItem(String time, String admin, String action, String object, String ip) {
    }

    public record SuspiciousSessionItem(String user, String ip, String note, String status) {
    }
}
