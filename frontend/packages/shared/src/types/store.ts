import { MarketingSettings } from '../services/marketingService';

export type StoreStatus = 'draft' | 'live' | 'paused';

export interface StoreLogo {
    url: string;
    publicId: string;
}

export interface StoreDomain {
    type?: 'subdomain' | 'custom';
    subdomain: string;
    customDomain?: string;
    isVerified?: boolean;
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
    settledRevenue: number;
    totalCustomers: number;
    totalVisitors: number;
}

export interface StoreThemeCustomizations {
    buttonRadius?: 'sharp' | 'soft' | 'pill';
    productGrid?: {
        columns?: 2 | 3 | 4;
        showRatings?: boolean;
    };
    announcementBar?: {
        enabled?: boolean;
        text?: string;
        backgroundColor?: string;
        textColor?: string;
    };
    hero?: {
        headline?: string;
        subheadline?: string;
        ctaText?: string;
    };
    footer?: {
        copyrightText?: string;
    };
    heroSlider?: {
        slides: HeroSlide[];
    };
}

export interface HeroSlide {
    /** Client-generated, stable across reorders/saves. */
    id: string;
    type: 'image' | 'product';
    /** Cloudinary URL — always a fresh upload, for both slide types. */
    imageUrl: string;
    imagePublicId?: string;
    /** 'image' slides only — optional, makes the slide clickable. */
    link?: string;
    /** 'product' slides only. */
    productId?: string;
    /** Denormalized at save time so the storefront can link with no lookup. */
    productSlug?: string;
    /** Denormalized for display if the product is later deleted. */
    productName?: string;
    caption?: string;
}

export interface StoreTheme {
    name: string;
    customizations: StoreThemeCustomizations;
}

export interface Store {
    _id: string;
    merchant: string;
    name: string;
    description?: string;
    category?: string;
    status: StoreStatus;
    logo?: StoreLogo;
    favicon?: StoreLogo;
    domain: StoreDomain;
    branding: StoreBranding;
    theme?: StoreTheme;
    contact: StoreContact;
    settings: {
        currency: string;
        payment: {
            provider?: string;
            credentials?: {
                apiKey?: string;
                apiSecret?: string;
                publicKey?: string;
                iframeId?: string;
            };
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
            provider: 'local' | 'bosta' | 'aramex';
            credentials?: {
                apiKey?: string;
                apiSecret?: string;
                accountNumber?: string;
            };
            zones: any[];
        };
        policies: {
            returnPolicy?: string;
            privacyPolicy?: string;
            termsOfService?: string;
            shippingPolicy?: string;
        };
        marketing?: MarketingSettings;
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
