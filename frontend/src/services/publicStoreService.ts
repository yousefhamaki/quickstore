import api from './api';

export const getPublicStore = async (subdomain: string) => {
    const response = await api.get(`/public/stores/${subdomain}`);
    return response.data;
};

export const getStoreProducts = async (storeId: string) => {
    const response = await api.get(`/public/stores/${storeId}/products`);
    return response.data;
};

export const getProductDetails = async (productId: string) => {
    const response = await api.get(`/public/products/${productId}`);
    return response.data;
};
