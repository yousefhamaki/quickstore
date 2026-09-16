import api from './api';
import { Store } from '@shared/types/store';

export const getPublicStore = async (subdomain: string): Promise<Store> => {
    const response = await api.get<Store>(`/public/stores/${subdomain}?_cb=${Date.now()}`);
    return response.data;
};

export const getStoreProducts = async (storeId: string) => {
    const response = await api.get(`/public/stores/${storeId}/products?_cb=${Date.now()}`);
    return response.data;
};

export const getStoreCategories = async (storeId: string) => {
    const response = await api.get(`/public/stores/${storeId}/categories?_cb=${Date.now()}`);
    return response.data as { _id: string; name: string; slug: string }[];
};

export const getProductDetails = async (productId: string) => {
    const response = await api.get(`/public/products/${productId}`);
    return response.data;
};
export const trackVisit = async (storeId: string) => {
    const response = await api.post(`/public/stores/${storeId}/visit`);
    return response.data;
};

export const validateCoupon = async (storeId: string, code: string, subtotal: number, email?: string) => {
    const emailParam = email ? `&email=${encodeURIComponent(email)}` : '';
    const response = await api.get(`/public/stores/${storeId}/coupons/validate?code=${code}&subtotal=${subtotal}${emailParam}`);
    return response.data;
};

/**
 * Finds the best eligible auto-apply coupon (if any) for the current cart
 * subtotal — lets the checkout page show it to the shopper before they
 * place the order (see publicController.getAutoApplyCoupon). The server
 * independently re-derives this same answer at order-creation time, so a
 * stale/tampered value here can never change what's actually charged.
 */
export const getAutoApplyCoupon = async (storeId: string, subtotal: number, email?: string) => {
    const emailParam = email ? `&email=${encodeURIComponent(email)}` : '';
    const response = await api.get(`/public/stores/${storeId}/coupons/auto-apply?subtotal=${subtotal}${emailParam}`);
    return response.data;
};
