"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ProductSchema = new mongoose_1.Schema({
    storeId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Store', required: true },
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
            _id: { type: mongoose_1.Schema.Types.ObjectId, default: () => new mongoose_1.default.Types.ObjectId() },
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
        canonicalUrl: { type: String },
        noindex: { type: Boolean, default: false },
        structuredData: { type: mongoose_1.Schema.Types.Mixed }
    },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });
// Enable virtuals
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });
// Derived stock virtuals
ProductSchema.virtual('totalStock').get(function () {
    if (this.variants && this.variants.length > 0) {
        return this.variants.reduce((sum, v) => v.isDeleted ? sum : sum + (v.inventory || 0), 0);
    }
    return this.inventory.quantity;
});
ProductSchema.virtual('totalReserved').get(function () {
    if (this.variants && this.variants.length > 0) {
        return this.variants.reduce((sum, v) => v.isDeleted ? sum : sum + (v.reserved || 0), 0);
    }
    return this.inventory.reserved || 0;
});
ProductSchema.virtual('totalAvailable').get(function () {
    if (this.variants && this.variants.length > 0) {
        return this.variants.reduce((sum, v) => {
            if (v.isDeleted)
                return sum;
            return sum + ((v.inventory || 0) - (v.reserved || 0));
        }, 0);
    }
    return (this.inventory.quantity || 0) - (this.inventory.reserved || 0);
});
ProductSchema.index({ storeId: 1, slug: 1 }, { unique: true });
ProductSchema.index({ storeId: 1, status: 1 });
ProductSchema.index({ storeId: 1, category: 1 });
ProductSchema.index({ storeId: 1, name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ "variants.sku": 1 }, { sparse: true });
exports.default = mongoose_1.default.model('Product', ProductSchema);
