import mongoose, { Schema, Document } from 'mongoose';

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
    isVerified: boolean;
}

export interface IPaymentSettings {
    methods: string[];
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
}

export interface IShippingSettings {
    enabled: boolean;
    zones: IShippingZone[];
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

export interface IStoreSettings {
    currency: string;
    language: string;
    timezone: string;
    payment: IPaymentSettings;
    shipping: IShippingSettings;
    tax: ITaxSettings;
    policies: IPolicies;
}

export interface ITheme {
    name: string;
    customizations: Record<string, any>;
}

export interface IStats {
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
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

    createdAt: Date;
    updatedAt: Date;
}

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
            customizations: { type: Schema.Types.Mixed, default: {} }
        },

        // Analytics
        stats: {
            totalProducts: { type: Number, default: 0 },
            totalOrders: { type: Number, default: 0 },
            totalRevenue: { type: Number, default: 0 },
            totalCustomers: { type: Number, default: 0 }
        }
    },
    { timestamps: true }
);

// Indexes
// StoreSchema.index({ slug: 1 }, { unique: true }); // Removed: Already defined in schema path
StoreSchema.index({ ownerId: 1 });
StoreSchema.index({ 'domain.subdomain': 1 }, { unique: true, sparse: true });
StoreSchema.index({ status: 1, isPublished: 1 });

export default mongoose.model<IStore>('Store', StoreSchema);
