import api from './api';

export const createOrder = async (orderData: any) => {
    const response = await api.post('/public/orders', orderData);
    return response.data;
};

export const getOrderDetails = async (orderId: string) => {
    const response = await api.get(`/public/orders/${orderId}`);
    return response.data;
};
