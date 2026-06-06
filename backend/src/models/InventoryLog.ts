import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryLog extends Document {
    storeId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    variantId?: mongoose.Types.ObjectId;
    orderId?: mongoose.Types.ObjectId;
    type: 'SALE' | 'RETURN' | 'RESTOCK' | 'ADJUSTMENT' | 'RESERVATION' | 'RELEASE';
    amount: number;
    previousBalance: number;
    newBalance: number;
    reason?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}

const InventoryLogSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, index: true },
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
        variantId: { type: Schema.Types.ObjectId, index: true },
        orderId: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
        type: {
            type: String,
            enum: ['SALE', 'RETURN', 'RESTOCK', 'ADJUSTMENT', 'RESERVATION', 'RELEASE'],
            required: true,
            index: true
        },
        amount: { type: Number, required: true }, // The change (+/-)
        previousBalance: { type: Number, required: true },
        newBalance: { type: Number, required: true },
        reason: { type: String },
        metadata: { type: Schema.Types.Mixed }
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index for history lookup
InventoryLogSchema.index({ storeId: 1, productId: 1, variantId: 1, createdAt: -1 });

export default mongoose.model<IInventoryLog>('InventoryLog', InventoryLogSchema);
