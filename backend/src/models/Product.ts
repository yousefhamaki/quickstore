import mongoose, { Schema, Document } from 'mongoose';

export interface IProductImage {
    url: string;
    publicId: string;
    isMain: boolean;
}

export interface IInventory {
    quantity: number;
    reserved: number;
    lowStockThreshold: number;
}

/**
 * A merchant-defined spec-table row (e.g. "Material" / "Cotton",
 * "Battery life" / "10 hours"). Free-form — not a fixed schema of known
 * attributes — rendered as-is on the storefront PDP when non-empty.
 */
export interface IProductFeature {
    label: string;
    value: string;
}

/**
 * An optional, per-product paid add-on (e.g. "1-year extended warranty,
 * +100 EGP") — never required, never inventory-tracked. Defined per-product
 * (not a shared/reusable store-wide library) to keep this simple. Mongoose
 * gives each subdocument its own `_id` automatically, which the cart/order
 * reference to know which extra(s) a shopper picked — see CartContext.tsx
 * and publicOrderController.createPublicOrder.
 */
export interface IProductExtra {
    _id?: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    price: number;
}

export interface ISEO {
    title?: string;
    description?: string;
    keywords?: string[];
    canonicalUrl?: string;
    noindex?: boolean;
    structuredData?: Record<string, any>;
}

export interface IProductVariant {
    _id?: mongoose.Types.ObjectId;
    name: string;
    options: Record<string, string>;
    sku?: string;
    price: number;
    inventory: number;
    reserved: number;
    isDeleted: boolean;
    image?: {
        url: string;
        publicId: string;
    };
}

export interface IProduct extends Document {
    storeId: mongoose.Types.ObjectId;
    name: string;
    slug: string;
    description: string;
    shortDescription?: string;
    images: IProductImage[];
    price: number;
    compareAtPrice?: number;
    costPerItem?: number;
    sku?: string;
    barcode?: string;
    trackInventory: boolean;
    inventory: IInventory;
    variants: IProductVariant[];
    options: { name: string; values: string[] }[]; // Keep option definitions
    /** Merchant-defined spec table — see IProductFeature. Public (rendered on the PDP). */
    features: IProductFeature[];
    /** Optional paid add-ons — see IProductExtra. Public (rendered on the PDP). */
    extras: IProductExtra[];
    /**
     * @deprecated Legacy freeform category name — kept only as a
     * denormalized display string, auto-synced from `categoryId`'s name
     * whenever it's set (see productController.ts). Real category
     * management/filtering must use `categoryId`, not this field.
     */
    category: string;
    categoryId?: mongoose.Types.ObjectId;
    tags: string[];
    /** Denormalized from approved Review documents — see reviewController.ts's
     * recomputeProductRating(). Recomputed on every moderation change rather
     * than incrementally updated, so it can't drift out of sync. */
    ratingAverage: number;
    ratingCount: number;
    status: 'draft' | 'active' | 'archived';
    seo: ISEO;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        name: { type: String, required: true },
        slug: { type: String, required: true },
        description: { type: String },
        shortDescription: { type: String },
        images: [
            {
                url: { type: String, required: true },
                publicId: { type: String, required: true },
                isMain: { type: Boolean, default: false },
            },
        ],
        price: { type: Number, required: true },
        compareAtPrice: { type: Number },
        costPerItem: { type: Number },
        sku: { type: String },
        barcode: { type: String },
        trackInventory: { type: Boolean, default: true },
        inventory: {
            quantity: { type: Number, default: 0, index: true },
            reserved: { type: Number, default: 0 },
            lowStockThreshold: { type: Number, default: 5 },
        },
        variants: [
            {
                _id: { type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
                name: { type: String },
                options: { type: Map, of: String },
                sku: { type: String, index: true },
                price: { type: Number },
                inventory: { type: Number, default: 0 },
                reserved: { type: Number, default: 0 },
                isDeleted: { type: Boolean, default: false, index: true },
                image: {
                    url: { type: String },
                    publicId: { type: String },
                },
            },
        ],
        options: [
            {
                name: { type: String },
                values: [{ type: String }],
            },
        ],
        features: [
            {
                _id: false,
                label: { type: String, maxlength: 100 },
                value: { type: String, maxlength: 300 },
            },
        ],
        extras: [
            // No `_id: false` here (unlike features) — the auto-generated
            // subdocument _id is exactly what the cart/order reference to
            // identify which extra(s) were selected.
            {
                name: { type: String, required: true, maxlength: 100 },
                description: { type: String, maxlength: 300 },
                price: { type: Number, required: true },
            },
        ],
        category: { type: String },
        categoryId: { type: Schema.Types.ObjectId, ref: 'Category', index: true },
        tags: [{ type: String }],
        ratingAverage: { type: Number, default: 0 },
        ratingCount: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ['draft', 'active', 'archived'],
            default: 'active',
        },
        seo: {
            title: { type: String },
            description: { type: String },
            keywords: [{ type: String }],
            canonicalUrl: { type: String },
            noindex: { type: Boolean, default: false },
            structuredData: { type: Schema.Types.Mixed }
        },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Enable virtuals
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

// Derived stock virtuals
ProductSchema.virtual('totalStock').get(function (this: IProduct) {
    if (this.variants && this.variants.length > 0) {
        return this.variants.reduce((sum: number, v: IProductVariant) => v.isDeleted ? sum : sum + (v.inventory || 0), 0);
    }
    return this.inventory.quantity;
});

ProductSchema.virtual('totalReserved').get(function (this: IProduct) {
    if (this.variants && this.variants.length > 0) {
        return this.variants.reduce((sum: number, v: IProductVariant) => v.isDeleted ? sum : sum + (v.reserved || 0), 0);
    }
    return this.inventory.reserved || 0;
});

ProductSchema.virtual('totalAvailable').get(function (this: IProduct) {
    if (this.variants && this.variants.length > 0) {
        return this.variants.reduce((sum: number, v: IProductVariant) => {
            if (v.isDeleted) return sum;
            return sum + ((v.inventory || 0) - (v.reserved || 0));
        }, 0);
    }
    return (this.inventory.quantity || 0) - (this.inventory.reserved || 0);
});

ProductSchema.index({ storeId: 1, slug: 1 }, { unique: true });
ProductSchema.index({ storeId: 1, status: 1 });
ProductSchema.index({ storeId: 1, status: 1, createdAt: -1 });
ProductSchema.index({ storeId: 1, category: 1 });
ProductSchema.index({ storeId: 1, categoryId: 1 });
ProductSchema.index({ storeId: 1, name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ "variants.sku": 1 }, { sparse: true });

export default mongoose.model<IProduct>('Product', ProductSchema);
