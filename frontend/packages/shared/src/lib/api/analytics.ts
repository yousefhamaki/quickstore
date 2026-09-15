import api from '@shared/services/api';

export interface AnalyticsOverview {
    totalOrders: number;
    recentOrders: number;
    totalRevenue: number;
    completedRevenue: number;
    pendingRevenue: number;
    recentRevenue: number;
    /** Revenue minus cost, derived from each order item's costAtPurchase
     * snapshot — see backend analyticsController.getOverview for how orders
     * placed before that field existed are handled. */
    grossProfit: number;
    /** grossProfit as a percentage of totalRevenue. */
    marginPercent: number;
    totalCustomers: number;
    recentCustomers: number;
    totalProducts: number;
    lowStockProducts: number;
    totalVisitors: number;
    conversion: number;
}

export interface TopProduct {
    _id: string;
    totalSold: number;
    revenue: number;
    cost: number;
    profit: number;
    productName: string;
    productImage?: string;
}

export const getAnalyticsOverview = async (days = 30): Promise<AnalyticsOverview> => {
    const { data } = await api.get(`/analytics/overview?days=${days}`);
    return data as AnalyticsOverview;
};

export const getRecentOrdersAnalytics = async (limit = 5): Promise<any[]> => {
    const { data } = await api.get(`/analytics/recent-orders?limit=${limit}`);
    return data as any[];
};

export const getTopProductsAnalytics = async (limit = 5): Promise<TopProduct[]> => {
    const { data } = await api.get(`/analytics/top-products?limit=${limit}`);
    return data as TopProduct[];
};
