import mongoose, { Schema, Document } from 'mongoose';

export interface IProductImage {
    url: string;
    publicId: string;
    isMain: boolean;
}

export interface IInventory {
    quantity: number;
    lowStockThreshold: number;
}

export interface ISEO {
    title: string;
    description: string;
    keywords: string[];
}

export interface IProductVariant {
    name: string;
    options: Record<string, string>;
    sku?: string;
    price: number;
    inventory: number;
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
    category: string;
    tags: string[];
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
            quantity: { type: Number, default: 0 },
            lowStockThreshold: { type: Number, default: 5 },
        },
        variants: [
            {
                name: { type: String },
                options: { type: Map, of: String },
                sku: { type: String },
                price: { type: Number },
                inventory: { type: Number, default: 0 },
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
        category: { type: String },
        tags: [{ type: String }],
        status: {
            type: String,
            enum: ['draft', 'active', 'archived'],
            default: 'active',
        },
        seo: {
            title: { type: String },
            description: { type: String },
            keywords: [{ type: String }],
        },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

ProductSchema.index({ storeId: 1, slug: 1 }, { unique: true });
ProductSchema.index({ storeId: 1, status: 1 });
ProductSchema.index({ storeId: 1, category: 1 });
ProductSchema.index({ storeId: 1, name: 'text', description: 'text', tags: 'text' });

export default mongoose.model<IProduct>('Product', ProductSchema);
