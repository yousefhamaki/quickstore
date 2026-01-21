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
const StoreSchema = new mongoose_1.Schema({
    ownerId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
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
        isVerified: { type: Boolean, default: false }
    },
    // Settings
    settings: {
        currency: { type: String, default: 'EGP' },
        language: { type: String, default: 'en' },
        timezone: { type: String, default: 'Africa/Cairo' },
        payment: {
            methods: [{ type: String }],
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
            zones: [{
                    name: { type: String },
                    cities: [{ type: String }],
                    rate: { type: Number },
                    freeShippingThreshold: { type: Number }
                }]
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
        }
    },
    // Theme
    theme: {
        name: { type: String, default: 'modern' },
        customizations: { type: mongoose_1.Schema.Types.Mixed, default: {} }
    },
    // Analytics
    stats: {
        totalProducts: { type: Number, default: 0 },
        totalOrders: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        totalCustomers: { type: Number, default: 0 }
    }
}, { timestamps: true });
// Indexes
StoreSchema.index({ slug: 1 }, { unique: true });
StoreSchema.index({ ownerId: 1 });
StoreSchema.index({ 'domain.subdomain': 1 }, { unique: true, sparse: true });
StoreSchema.index({ status: 1, isPublished: 1 });
exports.default = mongoose_1.default.model('Store', StoreSchema);
