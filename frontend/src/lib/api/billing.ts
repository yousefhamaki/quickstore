import api from '@/services/api';

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
    };
    isActive: boolean;
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
        type: 'free' | 'paid';
        monthlyPrice: number;
        features: {
            dropshipping: boolean;
            customDomain: boolean;
        };
    };
    subscription: {
        status: string;
        startedAt: string;
        expiresAt: string;
        trialExpiresAt?: string;
        gracePeriodEnd?: string;
        renewalDate: string;
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
    reason: 'order_fee' | 'plan_payment' | 'recharge';
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

export const rechargeWallet = async (amount: number): Promise<{ paymentUrl?: string; success: boolean; message?: string }> => {
    const { data } = await api.post('/billing/wallet/recharge', { amount });
    return data as { paymentUrl?: string; success: boolean; message?: string };
};

export const subscribeToPlan = async (planId: string): Promise<any> => {
    const { data } = await api.post('/billing/subscribe', { planId });
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

export const updateBillingProfile = async (formData: any) => {
    const { data } = await api.put('/billing/profile', formData);
    return data;
};
