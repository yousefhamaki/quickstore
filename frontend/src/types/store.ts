export type StoreStatus = 'draft' | 'live' | 'paused';

export interface StoreLogo {
    url: string;
    publicId: string;
}

export interface StoreDomain {
    subdomain: string;
    customDomain?: string;
    isCustomDomainVerified?: boolean;
}

export interface StoreBranding {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
}

export interface StoreContact {
    email?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
    facebook?: string;
    instagram?: string;
}

export interface StoreStats {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
}

export interface Store {
    _id: string;
    merchant: string;
    name: string;
    description?: string;
    category?: string;
    status: StoreStatus;
    logo?: StoreLogo;
    domain: StoreDomain;
    branding: StoreBranding;
    contact: StoreContact;
    settings: {
        currency: string;
        payment: {
            methods: string[];
            bankDetails?: {
                bankName: string;
                accountNumber: string;
                accountName: string;
            };
            instapayNumber?: string;
            vcashNumber?: string;
        };
        shipping: {
            enabled: boolean;
            zones: any[];
        };
        policies: {
            returnPolicy?: string;
            privacyPolicy?: string;
            termsOfService?: string;
            shippingPolicy?: string;
        };
    };
    stats: StoreStats;
    createdAt: string;
    updatedAt: string;
}

export interface CreateStoreData {
    name: string;
    description?: string;
    category?: string;
    branding: StoreBranding;
    contact: StoreContact;
    domain: {
        subdomain: string;
    };
}

export interface ChecklistItem {
    label: string;
    completed: boolean;
}

export interface OnboardingChecklist {
    checklist: {
        storeInfo: ChecklistItem;
        branding: ChecklistItem;
        products: ChecklistItem & { current: number; target: number };
        payment: ChecklistItem;
        shipping: ChecklistItem;
        policies: ChecklistItem;
    };
    progress: {
        completed: number;
        total: number;
        percentage: number;
    };
}
