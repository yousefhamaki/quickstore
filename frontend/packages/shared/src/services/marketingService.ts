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

export interface SocialSharingSettings {
    enabled: boolean;
    platforms: string[];
    defaultMessage?: string;
}

export interface MarketingSettings {
    facebookPixelId?: string;
    googleAnalyticsId?: string;
    tiktokPixelId?: string;
    snapchatPixelId?: string;
    seoTitle?: string;
    seoDescription?: string;
    socialSharing?: SocialSharingSettings;
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

export const updateSocialSharing = async (data: {
    storeId: string;
    enabled: boolean;
    platforms: string[];
    defaultMessage?: string;
}) => {
    const response = await api.put('/marketing/social-sharing', data);
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

// Campaign & Quotas APIs
export interface Campaign {
    _id: string;
    storeId: string;
    name: string;
    subject: string;
    content: string;
    status: 'draft' | 'scheduled' | 'sent' | 'archived';
    segmentFilters: {
        tags?: string[];
        consentStatus?: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CampaignRun {
    _id: string;
    campaignId: string;
    storeId: string;
    status: 'scheduled' | 'quota_reserved' | 'preparing_recipients' | 'queued' | 'sending' | 'completed' | 'failed' | 'cancelled';
    totalRecipients: number;
    emailsDispatched: number;
    emailsDelivered: number;
    emailsBounced: number;
    scheduledAt?: string;
    startedAt?: string;
    completedAt?: string;
    errorMessage?: string;
    createdAt: string;
}

export interface EmailLedgerEntry {
    _id: string;
    storeId: string;
    type: 'monthly_grant' | 'purchase' | 'campaign_debit' | 'bounce_refund' | 'correction';
    amount: number;
    referenceId?: string;
    description: string;
    createdAt: string;
}

export interface EmailAccountBalanceResponse {
    balance: number;
    reserved: number;
    ledgerHistory: EmailLedgerEntry[];
}

export const getCampaigns = async (storeId: string): Promise<{ campaigns: Campaign[] }> => {
    const response = await api.get(`/campaigns?storeId=${storeId}`);
    return response.data as any;
};

export const getCampaign = async (id: string): Promise<{ campaign: Campaign; runs: CampaignRun[] }> => {
    const response = await api.get(`/campaigns/${id}`);
    return response.data as any;
};

export const createCampaign = async (data: Partial<Campaign> & { storeId: string }): Promise<Campaign> => {
    const response = await api.post('/campaigns', data);
    return response.data as any;
};

export const updateCampaign = async (id: string, data: Partial<Campaign>): Promise<Campaign> => {
    const response = await api.put(`/campaigns/${id}`, data);
    return response.data as any;
};

export const deleteCampaign = async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/campaigns/${id}`);
    return response.data as any;
};

export const sendCampaign = async (id: string): Promise<{ message: string; campaignRunId: string; totalRecipients: number }> => {
    const response = await api.post(`/campaigns/${id}/send`);
    return response.data as any;
};

export const getEmailAccountBalance = async (storeId: string): Promise<EmailAccountBalanceResponse> => {
    const response = await api.get(`/billing/${storeId}/email-account`);
    return response.data as any;
};

export const buyEmailAddOn = async (
    storeId: string, 
    emailCount: number
): Promise<{ 
    message: string; 
    balance: number; 
    planBalance: number; 
    purchasedBalance: number; 
    walletBalance: number; 
}> => {
    const response = await api.post(`/billing/${storeId}/email-account/buy-add-on`, { emailCount });
    return response.data as any;
};
