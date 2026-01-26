import api from './api';
import { Store } from '@/types/store';

export const getPublicStore = async (subdomain: string): Promise<Store> => {
    const response = await api.get<Store>(`/public/stores/${subdomain}`);
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
export const trackVisit = async (storeId: string) => {
    const response = await api.post(`/public/stores/${storeId}/visit`);
    return response.data;
};
