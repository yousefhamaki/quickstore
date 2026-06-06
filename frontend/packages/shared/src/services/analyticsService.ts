import api from './api';

export const getOverview = async (days: number = 30) => {
    const response = await api.get(`/analytics/overview?days=${days}`);
    return response.data;
};

export const getRevenueChart = async (period: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    const response = await api.get(`/analytics/revenue?period=${period}`);
    return response.data;
};

export const getTopProducts = async (limit: number = 5) => {
    const response = await api.get(`/analytics/top-products?limit=${limit}`);
    return response.data;
};

export const getRecentOrders = async (limit: number = 10) => {
    const response = await api.get(`/analytics/recent-orders?limit=${limit}`);
    return response.data;
};

export const getCustomerStats = async () => {
    const response = await api.get('/analytics/customers');
    return response.data;
};
