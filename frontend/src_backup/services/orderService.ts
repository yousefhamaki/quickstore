import api from './api';

export interface OrderFilters {
    pageNumber?: number;
    status?: string;
    search?: string;
    storeId?: string;
}

export const getOrders = async (filters?: OrderFilters) => {
    const params = new URLSearchParams();
    if (filters?.pageNumber) params.append('pageNumber', filters.pageNumber.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.storeId) params.append('storeId', filters.storeId);

    const response = await api.get(`/orders?${params.toString()}`);
    return response.data;
};

export const getOrder = async (id: string) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
};

export const createOrder = async (orderData: any) => {
    const response = await api.post('/orders', orderData);
    return response.data;
};

export const updateOrderStatus = async (id: string, status: string) => {
    const response = await api.put(`/orders/${id}/status`, { status });
    return response.data;
};

export const addMerchantNote = async (id: string, note: string) => {
    const response = await api.post(`/orders/${id}/notes`, { note });
    return response.data;
};

export const getOrderStats = async () => {
    const response = await api.get('/orders/stats');
    return response.data;
};
