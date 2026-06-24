import api from '@shared/services/api';

export interface OfferProduct {
    productId: string;
    variantId?: string;
    name: string;
    image?: string;
    basePrice: number;
    offerPrice: number;
    savingsAmount: number;
    quantity: number;
    displayOrder: number;
    options?: any[];
    variants?: any[];
}

export interface EvaluatedOffer {
    campaignId: string;
    type: 'upsell' | 'cross_sell' | 'down_sell' | 'offer_page';
    priority: number;
    name: string;
    display: {
        title: string;
        subtitle?: string;
        callToActionText: string;
        declineText?: string;
        timerSeconds?: number;
    };
    offerProducts: OfferProduct[];
    totalSavings: number;
    replacesProductId?: string;
    replacesVariantId?: string;
    snapshot: any;
}

export interface EvaluateOffersPayload {
    storeId: string;
    event: 'add_to_cart' | 'checkout_start' | 'checkout_abandon_intent' | 'post_purchase';
    sessionId: string;
    cartItems: {
        productId: string;
        variantId?: string;
        quantity: number;
        price: number;
        category?: string;
    }[];
    cartSubtotal: number;
    customerId?: string;
}

// Storefront API Functions

export const evaluateOffers = async (payload: EvaluateOffersPayload): Promise<EvaluatedOffer[]> => {
    const { data }: { data: any } = await api.post('/public/offers/evaluate', payload);
    return data.offers || [];
};

export const recordImpression = async (payload: {
    storeId: string;
    campaignId: string;
    sessionId: string;
    offerType: string;
    snapshot: any;
    cartValueAtTime: number;
    orderId?: string;
    customerId?: string;
}): Promise<string> => {
    const { data }: { data: any } = await api.post('/public/offers/impression', payload);
    return data.impressionId;
};

export const recordDecision = async (impressionId: string, decision: 'declined' | 'accepted'): Promise<void> => {
    await api.post('/public/offers/decision', { impressionId, decision });
};

export const acceptOffer = async (payload: {
    impressionId: string;
    orderId: string;
    sessionId: string;
}): Promise<{ newTotal: number; newSubtotal: number; addedItems: any[] }> => {
    const { data }: { data: any } = await api.post('/public/offers/accept', payload);
    return data;
};

// Merchant API Functions (For Phase 4 dashboard implementation, mocked here)

export const getCampaigns = async (storeId: string, params?: any) => {
    const { data } = await api.get(`/merchant/offers/campaigns`, { params: { storeId, ...params } });
    return data;
};

export const createCampaign = async (payload: any) => {
    const { data } = await api.post('/merchant/offers/campaigns', payload);
    return data;
};

export const updateCampaign = async (id: string, payload: any) => {
    const { data } = await api.put(`/merchant/offers/campaigns/${id}`, payload);
    return data;
};

export const deleteCampaign = async (id: string) => {
    const { data } = await api.delete(`/merchant/offers/campaigns/${id}`);
    return data;
};

export const getCampaignAnalytics = async (campaignId: string, storeId: string, days = 30) => {
    const { data } = await api.get(`/merchant/offers/analytics/${campaignId}?storeId=${storeId}&days=${days}`);
    return data;
};

export const getPublicCampaign = async (id: string, storeId: string) => {
    const { data }: { data: any } = await api.get(`/public/offers/campaigns/${id}`, { params: { storeId } });
    return data.campaign;
};
