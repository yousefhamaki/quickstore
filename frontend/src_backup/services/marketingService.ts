import api from './api';

export interface Coupon {
    _id: string;
    code: string;
    type: 'percentage' | 'fixed' | 'free_shipping';
    value: number;
    maxUsage: number;
    usageCount: number;
    minOrderAmount?: number;
    expiresAt?: string;
    isActive: boolean;
}

export interface MarketingSettings {
    facebookPixelId?: string;
    googleAnalyticsId?: string;
    tiktokPixelId?: string;
    snapchatPixelId?: string;
    seoTitle?: string;
    seoDescription?: string;
}

export interface MarketingSettingsResponse {
    success: boolean;
    marketing?: MarketingSettings;
}

export const getCoupons = async (storeId: string) => {
    const response = await api.get(`/coupons?storeId=${storeId}`);
    return response.data;
};

export const createCoupon = async (data: Partial<Coupon> & { storeId: string }) => {
    const response = await api.post('/coupons', data);
    return response.data;
};

export const deleteCoupon = async (id: string) => {
    const response = await api.delete(`/coupons/${id}`);
    return response.data;
};

export const updateCoupon = async (id: string, data: Partial<Coupon>) => {
    const response = await api.put(`/coupons/${id}`, data);
    return response.data;
};

// Pixels & SEO
export const getMarketingSettings = async (storeId: string): Promise<MarketingSettingsResponse> => {
    const response = await api.get<MarketingSettingsResponse>(`/marketing/settings?storeId=${storeId}`);
    return response.data;
};

export const updatePixels = async (data: { storeId: string, [key: string]: any }) => {
    const response = await api.put('/marketing/pixels', data);
    return response.data;
};

export const updateSEO = async (data: { storeId: string, seoTitle: string, seoDescription: string }) => {
    const response = await api.put('/marketing/seo', data);
    return response.data;
};

// Abandoned Carts
export const getAbandonedCarts = async (storeId: string) => {
    const response = await api.get(`/abandoned-carts?storeId=${storeId}`);
    return response.data;
};

export const updateAbandonedCartStatus = async (id: string, status: string) => {
    const response = await api.put(`/abandoned-carts/${id}`, { status });
    return response.data;
};

// AI Marketing
export const generateAICopy = async (data: { storeId: string, prompt: string, type: string }) => {
    const response = await api.post('/ai-marketing/generate', data);
    return response.data;
};

export const getAIUsage = async (storeId: string) => {
    const response = await api.get(`/ai-marketing/usage?storeId=${storeId}`);
    return response.data;
};
