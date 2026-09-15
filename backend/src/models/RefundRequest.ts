import mongoose, { Schema, Document } from 'mongoose';

/**
 * A customer-initiated ask for money back on an order, separate from the
 * merchant's own direct refund tools (issuePartialRefund / updateOrderStatus
 * in orderController.ts). Approving one calls the SAME applyOrderRefund
 * engine those use, so the financial logic (fee proration, revenue
 * reversal, one-time-only guards) is identical either way — this model is
 * purely the request/approval workflow layered in front of it.
 */
export interface IRefundRequest extends Document {
    storeId: mongoose.Types.ObjectId;
    orderId: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    requestedAmount: number;
    reason: string;
    photoUrl?: string;
    photoPublicId?: string;
    status: 'pending' | 'approved' | 'rejected';
    // Set on resolution. finalAmount may differ from requestedAmount — the
    // merchant can adjust it up or down when approving.
    finalAmount?: number;
    merchantResponseNote?: string;
    resolvedAt?: Date;
    resolvedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const RefundRequestSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        requestedAmount: { type: Number, required: true },
        reason: { type: String, required: true },
        photoUrl: { type: String },
        photoPublicId: { type: String },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        finalAmount: { type: Number },
        merchantResponseNote: { type: String },
        resolvedAt: { type: Date },
        resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

RefundRequestSchema.index({ storeId: 1, status: 1, createdAt: -1 });
RefundRequestSchema.index({ orderId: 1 });
RefundRequestSchema.index({ customerId: 1 });

export default mongoose.model<IRefundRequest>('RefundRequest', RefundRequestSchema);
