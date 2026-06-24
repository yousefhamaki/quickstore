import mongoose, { Schema, Document } from 'mongoose';

export interface IAddress {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
}

export interface IConsentAudit {
    status: string;
    action: string;
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
    consentText: string;
}

export interface ICustomer extends Document {
    storeId: mongoose.Types.ObjectId;
    email: string;
    password?: string;
    firstName?: string; // Optional for newsletter-only subscribers
    lastName?: string;  // Optional for newsletter-only subscribers
    phone?: string;
    addresses: IAddress[];
    orders: mongoose.Types.ObjectId[];
    
    // Marketing Consent & Subscription
    consentStatus: 'subscribed' | 'unsubscribed' | 'pending' | 'bounced' | 'complained';
    consentHistory: IConsentAudit[];
    source?: string;
    tags: string[];
    metadata: Record<string, any>;
    
    createdAt: Date;
    updatedAt: Date;
}

const CustomerSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        firstName: { type: String }, // Optional for newsletter-only subscribers
        lastName: { type: String },  // Optional for newsletter-only subscribers
        email: { type: String, required: true, trim: true, lowercase: true },
        password: { type: String },
        phone: { type: String },
        addresses: [
            {
                fullName: { type: String },
                phone: { type: String },
                address: { type: String },
                city: { type: String },
                state: { type: String },
                postalCode: { type: String },
                country: { type: String },
                isDefault: { type: Boolean, default: false },
            },
        ],
        orders: [{ type: Schema.Types.ObjectId, ref: 'Order' }],
        
        // Consent & newsletter tracking
        consentStatus: { 
            type: String, 
            enum: ['subscribed', 'unsubscribed', 'pending', 'bounced', 'complained'], 
            default: 'subscribed' 
        },
        consentHistory: [
            {
                status: { type: String },
                action: { type: String },
                timestamp: { type: Date, default: Date.now },
                ipAddress: { type: String },
                userAgent: { type: String },
                consentText: { type: String }
            }
        ],
        source: { type: String },
        tags: [{ type: String }],
        metadata: { type: Schema.Types.Mixed, default: {} }
    },
    { timestamps: true }
);

// Indexes for Tenant Isolation, Search, Sorting, and Uniqueness
CustomerSchema.index({ storeId: 1, email: 1 }, { unique: true });
CustomerSchema.index({ storeId: 1, consentStatus: 1, createdAt: -1 });
CustomerSchema.index({ storeId: 1, tags: 1 });

export default mongoose.model<ICustomer>('Customer', CustomerSchema);
