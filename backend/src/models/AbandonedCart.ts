import mongoose, { Schema, Document } from 'mongoose';

export interface IAbandonedCart extends Document {
    storeId: mongoose.Types.ObjectId;
    customerEmail: string;
    customerPhone?: string;
    customerName?: string;
    items: any[];
    totalAmount: number;
    status: 'pending' | 'recovered' | 'contacted';
    createdAt: Date;
    updatedAt: Date;
}

const AbandonedCartSchema: Schema = new Schema({
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String },
    customerName: { type: String },
    items: [{ type: Schema.Types.Mixed }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'recovered', 'contacted'], default: 'pending' },
}, { timestamps: true });

// Index for performance
AbandonedCartSchema.index({ storeId: 1, createdAt: -1 });
AbandonedCartSchema.index({ customerEmail: 1 });

export default mongoose.model<IAbandonedCart>('AbandonedCart', AbandonedCartSchema);
