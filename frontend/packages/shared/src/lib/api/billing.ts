import api from '@shared/services/api';

export interface Plan {
    _id: string;
    name: string;
    type: 'free' | 'paid';
    monthlyPrice: number;
    storeLimit: number;
    productLimit: number;
    orderFee: number;
    features: {
        dropshipping: boolean;
        customDomain: boolean;
        allowUCD?: boolean;
        allowHeroSlider?: boolean;
        allowWhatsApp?: boolean;
    };
    isActive: boolean;
    name_en?: string;
    name_ar?: string;
    description_en?: string;
    description_ar?: string;
    features_en?: string[];
    features_ar?: string[];
    emailLimit?: number;
    whatsappLimit?: number;
}

export interface Subscription {
    _id: string;
    userId: string;
    planId: any;
    status: 'inactive' | 'active' | 'past_due' | 'canceled' | 'expired';
    startedAt: string;
    expiresAt: string;
    trialExpiresAt?: string;
    gracePeriodEnd?: string;
}

export interface Wallet {
    balance: number;
    currency: string;
}

export interface BillingOverview {
    wallet: Wallet;
    plan: {
        name: string;
        name_en?: string;
        name_ar?: string;
        type: 'free' | 'paid';
        monthlyPrice: number;
        features: {
            dropshipping: boolean;
            customDomain: boolean;
            allowWhatsApp?: boolean;
        };
    };
    subscription: {
        status: string;
        startedAt: string;
        expiresAt: string;
        trialExpiresAt?: string;
        gracePeriodEnd?: string;
        renewalDate: string;
        billingCycle?: 'monthly' | 'yearly';
    };
    usage: {
        storesUsed: number;
        storeLimit: number;
        productsUsed: number;
        productLimit: number;
    };
    blockingReason: 'LOW_WALLET' | 'SUBSCRIPTION_EXPIRED' | null;
    profile?: any;
}

export interface WalletTransaction {
    _id: string;
    userId: string;
    type: 'credit' | 'debit';
    amount: number;
    // Backed by WalletLedger.reason on the backend, which is a free-text
    // category (not a rigid enum) so a new reason can never break this API.
    // Known values today: 'gift' | 'plan_payment' | 'plan_upgrade' |
    // 'recharge' | 'order_fee' | 'addon_purchase' | 'admin_adjustment'.
    reason: string;
    referenceId?: string;
    createdAt: string;
}

export interface Receipt {
    _id: string;
    userId: string;
    referenceId: string;
    type: 'order' | 'wallet_recharge';
    amount: number;
    currency: string;
    issuedAt: string;
}

export const getPlans = async (): Promise<Plan[]> => {
    const { data } = await api.get('/billing/plans');
    return data as Plan[];
};

export const getBillingOverview = async (): Promise<BillingOverview> => {
    const { data } = await api.get('/billing/overview');
    return data as BillingOverview;
};

export const rechargeWallet = async (amount: number, method: string, walletNumber?: string): Promise<{ paymentUrl?: string; referenceCode?: string; success: boolean; message?: string }> => {
    const { data } = await api.post('/billing/wallet/recharge', { amount, method, walletNumber });
    return data as { paymentUrl?: string; referenceCode?: string; success: boolean; message?: string };
};

export const subscribeToPlan = async (planId: string, billingCycle?: 'monthly' | 'yearly', confirmDowngrade?: boolean): Promise<any> => {
    const { data } = await api.post('/billing/subscribe', { planId, billingCycle, confirmDowngrade });
    return data;
};

export const getSubscriptionPreview = async (planId: string, billingCycle?: 'monthly' | 'yearly'): Promise<any> => {
    const { data } = await api.post('/billing/subscribe/preview', { planId, billingCycle });
    return data;
};

export const getTransactions = async (page = 1, limit = 10): Promise<{ transactions: WalletTransaction[], pagination: any }> => {
    const { data } = await api.get(`/billing/transactions?page=${page}&limit=${limit}`);
    return data as { transactions: WalletTransaction[], pagination: any };
};

export const getReceipts = async (): Promise<Receipt[]> => {
    const { data } = await api.get('/billing/receipts');
    return data as Receipt[];
};

export const payFromWallet = async (): Promise<any> => {
    const { data } = await api.post('/billing/pay-with-wallet');
    return data;
};

export const updateBillingProfile = async (formData: any) => {
    const { data } = await api.put('/billing/profile', formData);
    return data;
};
