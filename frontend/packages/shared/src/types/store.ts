import { MarketingSettings } from '../services/marketingService';

export type StoreStatus = 'draft' | 'live' | 'paused';

// No-code email design blocks — mirrors backend/src/models/Store.ts's
// IEmailBlock exactly (backend/ and frontend/ are separate Node projects
// with no shared module boundary, so this type is duplicated by hand; keep
// both in sync when adding/changing a block type). The rendering mirror
// lives in lib/emailBlockRenderer.ts and is used ONLY for the live-preview
// iframe — the real send always goes through the backend's own renderer.
export type EmailBlockType = 'heading' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'html';
export type EmailBlockAlign = 'left' | 'center' | 'right';

export interface EmailHeadingBlock { id: string; type: 'heading'; text: string; level: 'h1' | 'h2'; align: EmailBlockAlign; color?: string; }
export interface EmailTextBlock { id: string; type: 'text'; text: string; align: EmailBlockAlign; color?: string; }
export interface EmailImageBlock { id: string; type: 'image'; imageUrl: string; imagePublicId?: string; altText?: string; link?: string; }
export interface EmailButtonBlock { id: string; type: 'button'; text: string; url: string; backgroundColor?: string; textColor?: string; align: EmailBlockAlign; }
export interface EmailDividerBlock { id: string; type: 'divider'; color?: string; }
export interface EmailSpacerBlock { id: string; type: 'spacer'; height: number; }
/** Legacy-passthrough only — never offered in EmailBlockEditor's "Add block" UI. */
export interface EmailHtmlBlock { id: string; type: 'html'; rawHtml: string; }

export type EmailBlock =
    | EmailHeadingBlock
    | EmailTextBlock
    | EmailImageBlock
    | EmailButtonBlock
    | EmailDividerBlock
    | EmailSpacerBlock
    | EmailHtmlBlock;

export interface EmailTemplate {
    subject: string;
    blocks?: EmailBlock[];
    // Legacy shape from before the block editor existed — still accepted
    // when reading old data; see lib/emailBlockRenderer.ts's
    // normalizeEmailTemplate for the fallback shim.
    heading?: string;
    body?: string;
}

export interface WhatsAppTemplate {
    body: string; // plain text + {{tokens}} — no blocks, WhatsApp is plain text with *bold*/_italic_, not HTML
}

export interface EmailSenderSMTP {
    host?: string;
    port?: number;
    secure?: boolean;
    username?: string;
    /** Never present in any API response — see the backend's EmailSenderSchema toJSON transform. Use `hasPassword` to know whether one is saved. */
    hasPassword?: boolean;
}

export interface EmailSenderSettings {
    mode: 'buildora' | 'custom';
    fromName?: string;
    fromEmail?: string;
    smtp?: EmailSenderSMTP;
    verified: boolean;
    lastTestedAt?: string;
    lastError?: string;
}

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
        emailNotifications?: {
            sendOrderConfirmation: boolean;
            sendStatusUpdates: boolean;
            templates: {
                orderConfirmation?: EmailTemplate;
                orderStatusChanged?: EmailTemplate;
                marketing?: EmailTemplate;
            };
        };
        emailSender?: EmailSenderSettings;
        whatsappNotifications?: {
            sendOrderConfirmation: boolean;
            sendStatusUpdates: boolean;
            templates: {
                orderConfirmation?: WhatsAppTemplate;
                orderStatusChanged?: WhatsAppTemplate;
                marketing?: WhatsAppTemplate;
            };
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
