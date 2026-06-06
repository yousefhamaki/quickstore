import api from '@/services/api';

export interface AnalyticsOverview {
    totalOrders: number;
    recentOrders: number;
    totalRevenue: number;
    completedRevenue: number;
    pendingRevenue: number;
    recentRevenue: number;
    totalCustomers: number;
    recentCustomers: number;
    totalProducts: number;
    lowStockProducts: number;
    totalVisitors: number;
    conversion: number;
}

export const getAnalyticsOverview = async (days = 30): Promise<AnalyticsOverview> => {
    const { data } = await api.get(`/analytics/overview?days=${days}`);
    return data as AnalyticsOverview;
};

export const getRecentOrdersAnalytics = async (limit = 5): Promise<any[]> => {
    const { data } = await api.get(`/analytics/recent-orders?limit=${limit}`);
    return data as any[];
};
