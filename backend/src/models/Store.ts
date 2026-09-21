import mongoose, { Schema, Document } from 'mongoose';
import { IMPLEMENTED_PAYMENT_PROVIDERS } from '../constants/paymentProviders';

export interface ICloudinaryImage {
    url: string;
    publicId: string;
}

export interface IBranding {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    bannerImage?: ICloudinaryImage;
}

export interface IContact {
    email: string;
    phone: string;
    address: string;
    whatsapp?: string;
    facebook?: string;
    instagram?: string;
}

export interface IDomain {
    type: 'subdomain' | 'custom';
    subdomain: string;
    customDomain?: string;
    // Ownership proof for `customDomain`, checked as a DNS TXT record at
    // `_buildora-verify.<customDomain>` — see services/domain/DomainVerificationService.ts.
    // Only meaningful while isVerified is false; not needed once verified.
    verificationToken?: string;
    isVerified: boolean;
}

export interface IPaymentSettings {
    methods: string[];
    // 'stripe' | 'paypal' | 'fawry' are intentionally NOT part of this type:
    // those integrations are unfinished skeletons (see
    // constants/paymentProviders.ts) and must not be selectable until they
    // have real checkout + webhook-signature implementations.
    provider?: 'manual' | 'paymob';
    credentials?: {
        apiKey?: string;
        apiSecret?: string;
        publicKey?: string;
        iframeId?: string;
    };
    bankDetails?: {
        bankName: string;
        accountNumber: string;
        accountName: string;
    };
    instapayNumber?: string;
    vcashNumber?: string;
}

export interface IShippingZone {
    name: string;
    cities: string[];
    rate: number;
    freeShippingThreshold: number;
    // Primary match key going forward — one of EGYPTIAN_GOVERNORATES's
    // `key` values (see constants/egyptianGovernorates.ts). Optional so
    // zones a merchant already manually created (matched only by `cities`)
    // keep working unchanged; a governorate-based zone added via the newer
    // "Add Governorate" picker always sets this.
    governorate?: string;
}

export interface IShippingSettings {
    enabled: boolean;
    provider: 'local' | 'bosta' | 'aramex';
    credentials?: {
        apiKey?: string;
        apiSecret?: string;
        accountNumber?: string;
    };
    zones: IShippingZone[];
    // Merchant-configurable base/default shipping fee, applied to any order
    // whose governorate/city doesn't match a specific zone below. Replaces
    // the old hardcoded-50-EGP assumption in publicOrderController.ts.
    standardRate: number;
}

export interface ITaxSettings {
    enabled: boolean;
    rate: number;
    includedInPrice: boolean;
}

export interface IPolicies {
    returnPolicy?: string;
    privacyPolicy?: string;
    termsOfService?: string;
    shippingPolicy?: string;
}

export interface ISocialSharingSettings {
    enabled: boolean;
    platforms: string[];
    defaultMessage?: string;
}

export type EmailBlockType = 'heading' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'html';
export type EmailBlockAlign = 'left' | 'center' | 'right';

// No-code email design blocks — see services/emailBlockRenderer.ts's
// renderBlocksToHtml for how this becomes the actual sent HTML, and
// frontend/packages/shared/src/types/store.ts's IEmailBlock +
// frontend/packages/shared/src/lib/emailBlockRenderer.ts for the
// client-side mirror used only to drive the live-preview iframe (backend/
// and frontend/ are separate Node projects with no shared module boundary
// — keep both copies in sync by hand when you add/change a block type).
export interface IEmailHeadingBlock { id: string; type: 'heading'; text: string; level: 'h1' | 'h2'; align: EmailBlockAlign; color?: string; }
export interface IEmailTextBlock { id: string; type: 'text'; text: string; align: EmailBlockAlign; color?: string; }
export interface IEmailImageBlock { id: string; type: 'image'; imageUrl: string; imagePublicId?: string; altText?: string; link?: string; }
export interface IEmailButtonBlock { id: string; type: 'button'; text: string; url: string; backgroundColor?: string; textColor?: string; align: EmailBlockAlign; }
export interface IEmailDividerBlock { id: string; type: 'divider'; color?: string; }
export interface IEmailSpacerBlock { id: string; type: 'spacer'; height: number; }
// Legacy-passthrough only — wraps pre-block-editor raw HTML (an old
// Campaign.content string, or a legacy Store email template heading/body
// pair) so nothing crashes on old data. Never offered in the "Add block"
// UI — see frontend's EmailBlockEditor.tsx.
export interface IEmailHtmlBlock { id: string; type: 'html'; rawHtml: string; }

export type IEmailBlock =
    | IEmailHeadingBlock
    | IEmailTextBlock
    | IEmailImageBlock
    | IEmailButtonBlock
    | IEmailDividerBlock
    | IEmailSpacerBlock
    | IEmailHtmlBlock;

export interface IEmailTemplate {
    subject: string;
    blocks: IEmailBlock[];
}

export interface IEmailNotificationSettings {
    // Merchant-facing on/off switches — order confirmation stays on by
    // default (customers expect it unconditionally), status updates can be
    // turned off if a merchant would rather not notify on every transition.
    sendOrderConfirmation: boolean;
    sendStatusUpdates: boolean;
    // Overrides for the built-in defaults (see emailService's
    // DEFAULT_STORE_EMAIL_TEMPLATES) — any field left blank falls back to
    // the default at send time, so a store never ends up with a truly
    // empty subject/body just because it was never edited.
    templates: {
        orderConfirmation?: IEmailTemplate;
        orderStatusChanged?: IEmailTemplate;
        marketing?: IEmailTemplate;
    };
}

export interface IEmailSenderSMTP {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    // AES-256-GCM ciphertext via utils/crypto.ts — see
    // services/mailer/storeMailer.ts for where it's decrypted to actually
    // send, and storeController's applyEmailSenderUpdate for the only place
    // a plaintext password is ever accepted/encrypted. Stripped from every
    // API response by EmailSenderSchema's toJSON transform below — never
    // trust or echo this field to the frontend.
    passwordEncrypted?: string;
}

export interface IEmailSenderSettings {
    // 'buildora' = the shared Resend sender (no-reply@quickstore.live).
    // 'custom' is only actually used at send time once `verified` is true
    // AND all smtp fields are present — see resolveStoreSender in
    // services/mailer/storeMailer.ts. A saved-but-unverified custom config
    // silently keeps using Buildora's sender rather than risking a blind
    // send through untested credentials.
    mode: 'buildora' | 'custom';
    fromName?: string;
    fromEmail?: string;
    smtp?: IEmailSenderSMTP;
    verified: boolean;
    lastTestedAt?: Date;
    lastError?: string;
}

export interface IWhatsAppTemplate {
    body: string; // plain text + {{tokens}} — WhatsApp formatting is *bold*/_italic_, not HTML, so no block editor here (see EmailBlockEditor for the email equivalent, which doesn't apply)
}

export interface IWhatsAppNotificationSettings {
    sendOrderConfirmation: boolean;
    sendStatusUpdates: boolean;
    templates: {
        orderConfirmation?: IWhatsAppTemplate;
        orderStatusChanged?: IWhatsAppTemplate;
        // Stored for a future Meta Cloud migration, but inert on the
        // Baileys provider — see services/whatsapp/whatsappSender.ts,
        // which hard-refuses to send anything categorized 'marketing'
        // over the unofficial channel regardless of what's saved here.
        marketing?: IWhatsAppTemplate;
    };
}

export interface IMarketingSettings {
    facebookPixelId?: string;
    googleAnalyticsId?: string;
    tiktokPixelId?: string;
    snapchatPixelId?: string;
    seoTitle?: string;
    seoDescription?: string;
    socialSharing?: ISocialSharingSettings;
}

export interface ISEOSettings {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogType?: string;
    ogImage?: string;
    twitterCard?: string;
    twitterUsername?: string;
    allowIndexing: boolean;
    sitemapEnabled: boolean;
}

/**
 * Storewide sale — a single active discount applied to every product's
 * otherwise-charged price (base price, or a selected variant's own price
 * when it has one), except products in `excludedCategoryIds`. See
 * utils/storeSale.ts for the single shared computation used by both the
 * public product read paths (publicController.ts) and the authoritative
 * checkout price resolution (publicOrderController.createPublicOrder) — so
 * what the storefront displays always matches what's actually charged.
 * `startAt`/`endAt` are optional; when unset the sale is purely
 * `enabled`-gated (always on/off, no schedule window).
 */
export interface IStoreSaleSettings {
    enabled: boolean;
    type: 'percentage' | 'fixed';
    value: number;
    startAt?: Date;
    endAt?: Date;
    excludedCategoryIds: mongoose.Types.ObjectId[];
}

/**
 * Post-delivery personal voucher — automatically generated and emailed to
 * a customer the FIRST time one of their orders reaches 'delivered' (see
 * orderController.updateOrderStatus's one-time side effect, guarded by
 * Order.voucherIssued the same way refundSideEffectsApplied guards its own
 * one-time logic). `minOrderAmountToTrigger` of 0/undefined means every
 * delivered order qualifies. The generated Coupon is scoped to that one
 * customer via Coupon.restrictedToCustomerEmail and expires `expiresInDays`
 * after issuance.
 */
export interface IPostPurchaseVoucherSettings {
    enabled: boolean;
    type: 'percentage' | 'fixed';
    value: number;
    minOrderAmountToTrigger?: number;
    expiresInDays: number;
}

export interface IStoreSettings {
    currency: string;
    language: string;
    timezone: string;
    payment: IPaymentSettings;
    shipping: IShippingSettings;
    tax: ITaxSettings;
    policies: IPolicies;
    emailNotifications: IEmailNotificationSettings;
    emailSender: IEmailSenderSettings;
    whatsappNotifications: IWhatsAppNotificationSettings;
    marketing: IMarketingSettings;
    storeSale: IStoreSaleSettings;
    postPurchaseVoucher: IPostPurchaseVoucherSettings;
}

/**
 * `customizations` is intentionally Mixed/untyped at the schema level (see
 * below) so new storefront appearance options can be added without a
 * migration — but the shape actually read by the storefront layout
 * (frontend/apps/saas-portal/.../store/[subdomain]/layout.tsx) and written
 * by the merchant theme settings page is:
 *   {
 *     buttonRadius?: 'sharp' | 'soft' | 'pill';
 *     productGrid?: { columns?: 2 | 3 | 4; showRatings?: boolean };
 *     announcementBar?: { enabled?: boolean; text?: string; backgroundColor?: string; textColor?: string };
 *     hero?: { headline?: string; subheadline?: string; ctaText?: string };
 *     footer?: { copyrightText?: string };
 *     heroSlider?: {
 *       slides: Array<{
 *         id: string;                    // client-generated, stable for reordering
 *         type: 'image' | 'product';
 *         imageUrl: string;              // Cloudinary URL — custom upload for both
 *                                        // slide types (product slides don't reuse
 *                                        // the product's own photo)
 *         imagePublicId?: string;        // Cloudinary publicId, for cleanup
 *         link?: string;                 // 'image' slides only — optional URL
 *         productId?: string;            // 'product' slides only
 *         productSlug?: string;          // denormalized at save time, so the
 *                                        // storefront can link without a lookup
 *         productName?: string;          // denormalized for display if the
 *                                        // product is later deleted
 *         caption?: string;
 *       }>;
 *     };
 *   }
 * heroSlider is gated by SubscriptionPlan.features.allowHeroSlider (see
 * storeController's updateStore and publicController's storefront read path)
 * — admin-controlled per plan, defaults to true for every plan at launch.
 * Keep frontend/packages/shared/src/types/store.ts's StoreThemeCustomizations
 * in sync with this comment if you add fields.
 */
export interface ITheme {
    name: string;
    customizations: Record<string, any>;
}

export interface IStats {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
    totalVisitors: number;
    aiUsage: {
        count: number;
        lastReset: Date;
    };
}

export interface IStore extends Document {
    ownerId: mongoose.Types.ObjectId;
    subscriptionId?: mongoose.Types.ObjectId; // Link to active subscription
    name: string;
    slug: string;
    description?: string;
    category?: string;
    logo?: ICloudinaryImage;
    favicon?: ICloudinaryImage;

    // Store Status System
    status: 'draft' | 'live' | 'paused';
    isPublished: boolean;
    publishedAt?: Date;

    // Branding
    branding: IBranding;

    // Contact & Social
    contact: IContact;

    // Domain
    domain: IDomain;

    // Settings
    settings: IStoreSettings;

    // Theme
    theme: ITheme;

    // Analytics
    stats: IStats;

    // SEO Settings
    seo?: ISEOSettings;

    createdAt: Date;
    updatedAt: Date;
}

// Its own nested Schema (not an inline object literal) specifically so it
// can carry its own scoped toJSON transform below — Mongoose cascades a
// subdocument's toJSON transform into the parent document's serialization,
// so every res.json(store)/res.json(updatedStore) response automatically
// gets the SMTP password ciphertext stripped without touching every
// controller that returns a store. This transform only fires for a
// hydrated document's .toJSON() — a .lean() query result or a
// .toObject() call skips it entirely, so any code path that builds a
// store payload that way (e.g. the store_customization Redis cache,
// or publicController's own .lean() query) must strip
// settings.emailSender.smtp.passwordEncrypted itself rather than relying
// on this transform.
const EmailSenderSchema = new Schema(
    {
        mode: { type: String, enum: ['buildora', 'custom'], default: 'buildora' },
        fromName: { type: String },
        fromEmail: { type: String },
        smtp: {
            host: { type: String },
            port: { type: Number },
            secure: { type: Boolean, default: false },
            username: { type: String },
            passwordEncrypted: { type: String }
        },
        verified: { type: Boolean, default: false },
        lastTestedAt: { type: Date },
        lastError: { type: String }
    },
    { _id: false }
);

EmailSenderSchema.set('toJSON', {
    transform: (_doc: any, ret: any) => {
        if (ret.smtp) {
            ret.smtp = { ...ret.smtp, hasPassword: !!ret.smtp.passwordEncrypted };
            delete ret.smtp.passwordEncrypted;
        }
        return ret;
    }
});

const StoreSchema: Schema = new Schema(
    {
        ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
        name: { type: String, required: true },
        slug: { type: String, required: true, unique: true },
        description: { type: String },
        category: { type: String },
        logo: {
            url: { type: String },
            publicId: { type: String }
        },
        favicon: {
            url: { type: String },
            publicId: { type: String }
        },

        // Store Status System
        status: {
            type: String,
            enum: ['draft', 'live', 'paused'],
            default: 'draft'
        },
        isPublished: { type: Boolean, default: false },
        publishedAt: { type: Date },

        // Branding
        branding: {
            primaryColor: { type: String, default: '#3B82F6' },
            secondaryColor: { type: String, default: '#1E40AF' },
            fontFamily: { type: String, default: 'Inter' },
            bannerImage: {
                url: { type: String },
                publicId: { type: String }
            }
        },

        // Contact & Social
        contact: {
            email: { type: String },
            phone: { type: String },
            address: { type: String },
            whatsapp: { type: String },
            facebook: { type: String },
            instagram: { type: String }
        },

        // Domain
        domain: {
            type: {
                type: String,
                enum: ['subdomain', 'custom'],
                default: 'subdomain'
            },
            subdomain: { type: String, required: true },
            customDomain: { type: String },
            verificationToken: { type: String },
            isVerified: { type: Boolean, default: false }
        },

        // Settings
        settings: {
            currency: { type: String, default: 'EGP' },
            language: { type: String, default: 'en' },
            timezone: { type: String, default: 'Africa/Cairo' },

            payment: {
                methods: [{ type: String }],
                // Kept in sync with constants/paymentProviders.ts. 'stripe' |
                // 'paypal' | 'fawry' are deliberately excluded — see that
                // file for why.
                provider: { type: String, enum: [...IMPLEMENTED_PAYMENT_PROVIDERS], default: 'manual' },
                credentials: {
                    apiKey: { type: String },
                    apiSecret: { type: String },
                    publicKey: { type: String },
                    iframeId: { type: String }
                },
                bankDetails: {
                    bankName: { type: String },
                    accountNumber: { type: String },
                    accountName: { type: String }
                },
                instapayNumber: { type: String },
                vcashNumber: { type: String }
            },

            shipping: {
                enabled: { type: Boolean, default: false },
                provider: { type: String, enum: ['local', 'bosta', 'aramex'], default: 'local' },
                credentials: {
                    apiKey: { type: String },
                    apiSecret: { type: String },
                    accountNumber: { type: String }
                },
                zones: [{
                    name: { type: String },
                    cities: [{ type: String }],
                    rate: { type: Number },
                    freeShippingThreshold: { type: Number },
                    governorate: { type: String }
                }],
                standardRate: { type: Number, default: 50 }
            },

            tax: {
                enabled: { type: Boolean, default: false },
                rate: { type: Number, default: 0 },
                includedInPrice: { type: Boolean, default: false }
            },

            policies: {
                returnPolicy: { type: String },
                privacyPolicy: { type: String },
                termsOfService: { type: String },
                shippingPolicy: { type: String }
            },

            emailNotifications: {
                sendOrderConfirmation: { type: Boolean, default: true },
                sendStatusUpdates: { type: Boolean, default: true },
                templates: {
                    orderConfirmation: {
                        subject: { type: String },
                        blocks: { type: [Schema.Types.Mixed], default: [] }
                    },
                    orderStatusChanged: {
                        subject: { type: String },
                        blocks: { type: [Schema.Types.Mixed], default: [] }
                    },
                    marketing: {
                        subject: { type: String },
                        blocks: { type: [Schema.Types.Mixed], default: [] }
                    }
                }
            },

            emailSender: { type: EmailSenderSchema, default: () => ({ mode: 'buildora', verified: false }) },

            whatsappNotifications: {
                sendOrderConfirmation: { type: Boolean, default: true },
                sendStatusUpdates: { type: Boolean, default: true },
                templates: {
                    orderConfirmation: { body: { type: String } },
                    orderStatusChanged: { body: { type: String } },
                    marketing: { body: { type: String } }
                }
            },

            marketing: {
                facebookPixelId: { type: String },
                googleAnalyticsId: { type: String },
                tiktokPixelId: { type: String },
                snapchatPixelId: { type: String },
                seoTitle: { type: String },
                seoDescription: { type: String },
                socialSharing: {
                    enabled: { type: Boolean, default: true },
                    platforms: {
                        type: [String],
                        default: ['facebook', 'twitter', 'whatsapp', 'pinterest', 'copyLink']
                    },
                    defaultMessage: { type: String, default: 'Check out this amazing product!' }
                }
            },

            storeSale: {
                enabled: { type: Boolean, default: false },
                type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
                value: { type: Number, default: 0 },
                startAt: { type: Date },
                endAt: { type: Date },
                excludedCategoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }]
            },

            postPurchaseVoucher: {
                enabled: { type: Boolean, default: false },
                type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
                value: { type: Number, default: 0 },
                minOrderAmountToTrigger: { type: Number, default: 0 },
                expiresInDays: { type: Number, default: 30 }
            }
        },

        // Theme
        theme: {
            name: { type: String, default: 'modern' },
            customizations: { type: Schema.Types.Mixed, default: {} }
        },

        // Analytics
        stats: {
            totalProducts: { type: Number, default: 0 },
            totalOrders: { type: Number, default: 0 },
            totalRevenue: { type: Number, default: 0 },
            totalCustomers: { type: Number, default: 0 },
            totalVisitors: { type: Number, default: 0 },
            aiUsage: {
                count: { type: Number, default: 0 },
                lastReset: { type: Date, default: Date.now }
            }
        },

        // SEO Settings
        seo: {
            metaTitle: { type: String },
            metaDescription: { type: String },
            keywords: [{ type: String }],
            ogType: { type: String, default: 'website' },
            ogImage: { type: String },
            twitterCard: { type: String, default: 'summary_large_image' },
            twitterUsername: { type: String },
            allowIndexing: { type: Boolean, default: true },
            sitemapEnabled: { type: Boolean, default: true }
        }
    },
    { timestamps: true }
);

// Indexes
// StoreSchema.index({ slug: 1 }, { unique: true }); // Removed: Already defined in schema path
StoreSchema.index({ ownerId: 1 });
StoreSchema.index({ 'domain.subdomain': 1 }, { unique: true, sparse: true });
// Without this, two different merchants could both set the same
// domain.customDomain string (updateStore never checked for a collision),
// and the public storefront lookup (`Store.findOne({$or:[{subdomain},
// {customDomain}]})`) would nondeterministically serve whichever store
// matched first — i.e. one merchant's real custom domain could end up
// showing another merchant's store content.
StoreSchema.index({ 'domain.customDomain': 1 }, { unique: true, sparse: true });
StoreSchema.index({ status: 1, isPublished: 1 });

export default mongoose.model<IStore>('Store', StoreSchema);
