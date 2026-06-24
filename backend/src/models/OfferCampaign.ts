import mongoose, { Schema, Document } from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// Enums & Literal Types
// ─────────────────────────────────────────────────────────────────────────────

export type OfferType = 'upsell' | 'cross_sell' | 'down_sell' | 'offer_page' | 'volume_discount' | 'bogo' | 'cart_threshold';
export type OfferStatus = 'draft' | 'active' | 'paused' | 'expired' | 'archived';
export type CampaignStatus = OfferStatus;
export type OfferPlacement = 'product_page' | 'cart' | 'checkout' | 'post_purchase' | 'standalone';
export type PriorityGroup = 'critical' | 'high' | 'normal' | 'low';
export type TriggerType = 'product' | 'collection' | 'subtotal';

export interface IVolumeDiscountTier {
    quantity: number;
    discountType: 'percentage' | 'fixed' | 'none';
    discountValue: number;
}

export interface IBogoConfig {
    triggerProductIds: mongoose.Types.ObjectId[];
    triggerQuantity: number;
    rewardProductId: mongoose.Types.ObjectId;
    rewardVariantId?: mongoose.Types.ObjectId;
    rewardQuantity: number;
    discountType: 'percentage' | 'fixed' | 'none';
    discountValue: number;
    overridePrice?: number;
}

export interface ICartThresholdReward {
    rewardProductId: mongoose.Types.ObjectId;
    rewardVariantId?: mongoose.Types.ObjectId;
    rewardQuantity: number;
    discountType: 'percentage' | 'fixed' | 'none';
    discountValue: number;
    overridePrice?: number;
}

export interface ICartThresholdConfig {
    minSubtotal: number;
    rewards: ICartThresholdReward[];
}

export type TriggerEvent =
    | 'product_page'
    | 'cart_view'
    | 'checkout_start'
    | 'post_purchase'
    | 'checkout_abandon';
export type DiscountType = 'none' | 'percentage' | 'fixed';

// ─────────────────────────────────────────────────────────────────────────────
// Sub-document Interfaces
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Conditions evaluated against the live cart state at trigger time.
 * All present conditions are AND-ed together. Within an array condition
 * (e.g. cartContainsProductIds), membership is OR-ed (ANY match fires).
 */
export interface IOfferTriggerConditions {
    /**
     * Campaign fires if ANY of these product IDs are present in the cart.
     * Used for product-specific upsells / cross-sells.
     */
    cartContainsProductIds?: mongoose.Types.ObjectId[];

    /**
     * Campaign fires only when cart subtotal >= this value.
     * Use-case: "Order 500 EGP+ and get a bundle add-on offer."
     */
    cartMinValue?: number;

    /**
     * Campaign fires only when cart subtotal <= this value.
     * Primarily for down-sells: "Cart under 200 EGP? Try our value pack."
     */
    cartMaxValue?: number;

    /**
     * Campaign fires if ANY cart item belongs to one of these categories.
     * Mirrors Product.category string field.
     */
    categoryMatch?: string[];
}

export interface IOfferTrigger {
    /** Which storefront event fires this campaign's evaluation. */
    event: TriggerEvent;
    conditions: IOfferTriggerConditions;
}

/**
 * A single product offered in the campaign, with optional price overrides.
 * The base product price is NEVER mutated — overrides are computed at
 * evaluation time and stored as a snapshot in OfferImpression.
 */
export interface IOfferProduct {
    _id?: mongoose.Types.ObjectId;
    /** Must belong to the same storeId as the campaign. */
    productId: mongoose.Types.ObjectId;
    /** If set, the offer targets a specific variant of the product. */
    variantId?: mongoose.Types.ObjectId;
    /** How to derive the offer price from the product's base price. */
    discountType: DiscountType;
    /**
     * Discount magnitude:
     * - 'percentage' → e.g. 20 means 20% off
     * - 'fixed'      → e.g. 50 means 50 EGP off
     * - 'none'       → ignored (base price used)
     */
    discountValue: number;
    /**
     * Hard-coded final price. When set, takes priority over
     * discountType + discountValue entirely.
     * Use-case: "Lock this bundle at 399 EGP regardless of base price."
     */
    overridePrice?: number;
    /** How many units of this product to add when accepted. Default: 1. */
    quantity: number;
    /** Controls rendering order within the offer UI block. */
    displayOrder: number;
}

/**
 * Merchant-facing display configuration. All strings support simple
 * template tokens that are interpolated at render time on the client:
 *   {{savings}}  → computed savings amount (e.g. "50 EGP")
 *   {{offerPrice}} → final offer price
 */
export interface IOfferDisplay {
    /** Main headline shown to the shopper. E.g. "Complete the set!" */
    headline: string;
    /** Optional supporting body text. */
    description?: string;
    /** Short badge text. E.g. "Save 20%" or "Best Value" */
    badgeText?: string;
    /**
     * Cloudinary URL to override the product's own image in the offer UI.
     * Falls back to product.images[0] when omitted.
     */
    imageOverride?: string;
    /** Primary action button label. E.g. "Add to order" */
    ctaText: string;
    /** Dismiss/decline link label. E.g. "No thanks" */
    dismissText: string;
    /**
     * Optional countdown timer duration in seconds shown in the offer UI.
     * 0 or undefined = no countdown.
     */
    countdownSeconds?: number;
}

export interface IOfferSchedule {
    startAt?: Date;
    endAt?: Date;
}

export interface IPricingTier {
    quantity: number;
    totalPrice: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root Document Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface IOfferCampaign extends Document {
    storeId: mongoose.Types.ObjectId;
    type: OfferType;
    name: string;
    status: CampaignStatus;
    priority: number;
    placement?: OfferPlacement;
    priorityGroup?: PriorityGroup;
    triggerType?: TriggerType;
    allowStacking?: boolean;
    exclusiveCampaign?: boolean;
    trigger: IOfferTrigger;
    offerProducts: IOfferProduct[];
    replacesProductId?: mongoose.Types.ObjectId;
    replacesVariantId?: mongoose.Types.ObjectId;
    display: IOfferDisplay;
    schedule?: IOfferSchedule;
    pricingTiers?: IPricingTier[];
    shippingFee?: number;
    volumeDiscountTiers?: IVolumeDiscountTier[];
    bogoConfig?: IBogoConfig;
    thresholdConfig?: ICartThresholdConfig;
    maxImpressionsPerCustomer: number;
    maxTotalAcceptances: number;
    totalAcceptances: number;
    analytics: {
        impressions: number;
        acceptances: number;
        revenue: number;
        dismissals: number;
        generatedOrders: number;
    };
    createdAt: Date;
    updatedAt: Date;
}
// ─────────────────────────────────────────────────────────────────────────────
// Schema Definition
// ─────────────────────────────────────────────────────────────────────────────

const OfferProductSchema = new Schema<IOfferProduct>(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        variantId: {
            type: Schema.Types.ObjectId,
        },
        discountType: {
            type: String,
            enum: ['none', 'percentage', 'fixed'],
            default: 'none',
        },
        discountValue: {
            type: Number,
            default: 0,
            min: 0,
        },
        overridePrice: {
            type: Number,
            min: 0,
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1,
        },
        displayOrder: {
            type: Number,
            default: 0,
        },
    },
    { _id: true }
);

const OfferTriggerConditionsSchema = new Schema<IOfferTriggerConditions>(
    {
        cartContainsProductIds: [
            { type: Schema.Types.ObjectId, ref: 'Product' },
        ],
        cartMinValue: {
            type: Number,
            min: 0,
        },
        cartMaxValue: {
            type: Number,
            min: 0,
        },
        categoryMatch: [{ type: String }],
    },
    { _id: false }
);

const OfferTriggerSchema = new Schema<IOfferTrigger>(
    {
        event: {
            type: String,
            enum: [
                'product_page',
                'cart_view',
                'checkout_start',
                'post_purchase',
                'checkout_abandon',
            ],
            required: true,
        },
        conditions: {
            type: OfferTriggerConditionsSchema,
            default: {},
        },
    },
    { _id: false }
);

const OfferDisplaySchema = new Schema<IOfferDisplay>(
    {
        headline: { type: String, required: true, trim: true, maxlength: 120 },
        description: { type: String, trim: true, maxlength: 500 },
        badgeText: { type: String, trim: true, maxlength: 40 },
        imageOverride: { type: String, trim: true },
        ctaText: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60,
            default: 'Add to order',
        },
        dismissText: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60,
            default: 'No thanks',
        },
        countdownSeconds: { type: Number, min: 0, default: 0 },
    },
    { _id: false }
);

const OfferScheduleSchema = new Schema<IOfferSchedule>(
    {
        startAt: { type: Date },
        endAt: { type: Date },
    },
    { _id: false }
);

const PricingTierSchema = new Schema<IPricingTier>(
    {
        quantity: { type: Number, required: true, min: 1 },
        totalPrice: { type: Number, required: true, min: 0 },
    },
    { _id: false }
);

const VolumeDiscountTierSchema = new Schema<IVolumeDiscountTier>(
    {
        quantity: { type: Number, required: true, min: 1 },
        discountType: { type: String, enum: ['none', 'percentage', 'fixed'], default: 'none' },
        discountValue: { type: Number, default: 0, min: 0 }
    },
    { _id: false }
);

const BogoConfigSchema = new Schema<IBogoConfig>(
    {
        triggerProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
        triggerQuantity: { type: Number, required: true, default: 1, min: 1 },
        rewardProductId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        rewardVariantId: { type: Schema.Types.ObjectId },
        rewardQuantity: { type: Number, required: true, default: 1, min: 1 },
        discountType: { type: String, enum: ['none', 'percentage', 'fixed'], default: 'none' },
        discountValue: { type: Number, default: 0, min: 0 },
        overridePrice: { type: Number }
    },
    { _id: false }
);

const CartThresholdRewardSchema = new Schema<ICartThresholdReward>(
    {
        rewardProductId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        rewardVariantId: { type: Schema.Types.ObjectId },
        rewardQuantity: { type: Number, required: true, default: 1, min: 1 },
        discountType: { type: String, enum: ['none', 'percentage', 'fixed'], default: 'none' },
        discountValue: { type: Number, default: 0, min: 0 },
        overridePrice: { type: Number }
    },
    { _id: false }
);

const CartThresholdConfigSchema = new Schema<ICartThresholdConfig>(
    {
        minSubtotal: { type: Number, required: true, min: 0 },
        rewards: [CartThresholdRewardSchema]
    },
    { _id: false }
);

const OfferCampaignSchema = new Schema<IOfferCampaign>(
    {
        storeId: {
            type: Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
        },
        type: {
            type: String,
            enum: ['upsell', 'cross_sell', 'down_sell', 'offer_page', 'volume_discount', 'bogo', 'cart_threshold'],
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        status: {
            type: String,
            enum: ['draft', 'active', 'paused', 'expired', 'archived'],
            default: 'draft',
        },
        placement: {
            type: String,
            enum: ['product_page', 'cart', 'checkout', 'post_purchase', 'standalone'],
            default: 'product_page',
        },
        priorityGroup: {
            type: String,
            enum: ['critical', 'high', 'normal', 'low'],
            default: 'normal',
        },
        triggerType: {
            type: String,
            enum: ['product', 'collection', 'subtotal'],
            default: 'product',
        },
        priority: {
            type: Number,
            default: 100,
            min: 1,
            index: true,
        },
        allowStacking: {
            type: Boolean,
            default: true,
        },
        exclusiveCampaign: {
            type: Boolean,
            default: false,
        },
        trigger: {
            type: OfferTriggerSchema,
            required: function(this: any) {
                return ['upsell', 'cross_sell', 'down_sell'].includes(this.type);
            },
        },
        offerProducts: {
            type: [OfferProductSchema],
            validate: {
                validator: (v: IOfferProduct[]) => {
                    // For Threshold or BOGO, offerProducts are optional or configured separately, but let's allow empty arrays for those types.
                    return Array.isArray(v);
                },
                message: 'A campaign must have valid offer products.',
            },
        },
        replacesProductId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
        },
        replacesVariantId: {
            type: Schema.Types.ObjectId,
        },
        display: {
            type: OfferDisplaySchema,
            required: true,
        },
        schedule: {
            type: OfferScheduleSchema,
        },
        volumeDiscountTiers: {
            type: [VolumeDiscountTierSchema],
        },
        bogoConfig: {
            type: BogoConfigSchema,
        },
        thresholdConfig: {
            type: CartThresholdConfigSchema,
        },
        maxImpressionsPerCustomer: {
            type: Number,
            default: 0, // 0 = unlimited
            min: 0,
        },
        maxTotalAcceptances: {
            type: Number,
            default: 0, // 0 = unlimited
            min: 0,
        },
        totalAcceptances: {
            type: Number,
            default: 0,
            min: 0,
        },
        analytics: {
            impressions: { type: Number, default: 0, min: 0 },
            acceptances: { type: Number, default: 0, min: 0 },
            revenue: { type: Number, default: 0, min: 0 },
            dismissals: { type: Number, default: 0, min: 0 },
            generatedOrders: { type: Number, default: 0, min: 0 },
        },
        shippingFee: {
            type: Number,
            min: 0,
            default: undefined,
        },
        pricingTiers: {
            type: [PricingTierSchema],
            default: undefined,
        },
    },
    { timestamps: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────────────────────────

// PRIMARY LOOKUP: Used by offerEvaluationService on every evaluate call.
// Queries always filter by storeId + status='active' + trigger.event.
OfferCampaignSchema.index(
    { storeId: 1, status: 1, 'trigger.event': 1 },
    { name: 'idx_campaign_store_status_event' }
);

// PRIORITY SORT: Used when ranking matched campaigns for sequential display.
OfferCampaignSchema.index(
    { storeId: 1, priority: 1 },
    { name: 'idx_campaign_store_priority' }
);

// TYPE FILTER: Used by merchant dashboard list views filtered by type.
OfferCampaignSchema.index(
    { storeId: 1, type: 1 },
    { name: 'idx_campaign_store_type' }
);

// TRIGGER PRODUCT LOOKUP: Used to quickly find campaigns that reference a
// specific product in their trigger conditions (for product page upsells).
OfferCampaignSchema.index(
    { storeId: 1, 'trigger.conditions.cartContainsProductIds': 1 },
    {
        name: 'idx_campaign_trigger_products',
        sparse: true,
    }
);

// SCHEDULE FILTER: Allows an efficient range scan on active + scheduled campaigns.
OfferCampaignSchema.index(
    { status: 1, 'schedule.startAt': 1, 'schedule.endAt': 1 },
    {
        name: 'idx_campaign_schedule',
        sparse: true,
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// Pre-save Hook: Business Rule Guards
// ─────────────────────────────────────────────────────────────────────────────

OfferCampaignSchema.pre<IOfferCampaign>('save', function () {
    // Guard: Offer Page validations
    if (this.type === 'offer_page') {
        if (this.offerProducts.length !== 1) {
            throw new Error('An offer page campaign must have exactly one product.');
        }
        if (!this.pricingTiers || this.pricingTiers.length === 0) {
            throw new Error('An offer page campaign must have at least one pricing tier.');
        }
        const quantities = new Set<number>();
        for (const tier of this.pricingTiers) {
            if (tier.quantity <= 0) {
                throw new Error('Quantity must be greater than 0.');
            }
            if (tier.totalPrice < 0) {
                throw new Error('Total price must be greater than or equal to 0.');
            }
            if (quantities.has(tier.quantity)) {
                throw new Error(`Duplicate quantity tier found: ${tier.quantity}`);
            }
            quantities.add(tier.quantity);
        }
        // Auto-sort tiers by quantity ascending
        this.pricingTiers.sort((a, b) => a.quantity - b.quantity);
    }
    // Guard: upsell-type campaigns that have a replacesProductId must have
    // exactly one offer product (you're replacing one item, not suggesting many).
    if (
        this.type === 'upsell' &&
        this.replacesProductId &&
        this.offerProducts.length > 1
    ) {
        throw new Error(
            'An upsell campaign with a replacesProductId can only have one offer product.'
        );
    }

    // Guard: down_sell campaigns should not target 'post_purchase' event
    // (post-purchase is inherently a completed sale — down-selling there is illogical).
    if (this.type === 'down_sell' && this.trigger?.event === 'post_purchase') {
        throw new Error(
            'Down-sell campaigns cannot target the post_purchase event. Use checkout_abandon instead.'
        );
    }

    // Guard: percentage discount must be between 1–99.
    if (this.offerProducts && this.offerProducts.length > 0) {
        for (const op of this.offerProducts) {
            if (op.discountType === 'percentage' && (op.discountValue < 1 || op.discountValue > 99)) {
                throw new Error(
                    `Percentage discount must be between 1 and 99. Got ${op.discountValue}.`
                );
            }
        }
    }

    // Guard: BOGO percentage discount validation
    if (this.type === 'bogo' && this.bogoConfig) {
        const bc = this.bogoConfig;
        if (bc.discountType === 'percentage' && (bc.discountValue < 1 || bc.discountValue > 100)) {
            throw new Error(`BOGO reward percentage discount must be between 1 and 100. Got ${bc.discountValue}.`);
        }
    }

    // Guard: Threshold percentage discount validation
    if (this.type === 'cart_threshold' && this.thresholdConfig) {
        for (const rw of this.thresholdConfig.rewards) {
            if (rw.discountType === 'percentage' && (rw.discountValue < 1 || rw.discountValue > 100)) {
                throw new Error(`Cart threshold reward percentage discount must be between 1 and 100. Got ${rw.discountValue}.`);
            }
        }
    }
});
export default mongoose.model<IOfferCampaign>('OfferCampaign', OfferCampaignSchema);
