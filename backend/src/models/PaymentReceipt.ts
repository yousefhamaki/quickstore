import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentReceipt extends Document {
    merchantId: mongoose.Types.ObjectId;
    storeId: mongoose.Types.ObjectId;
    planId: mongoose.Types.ObjectId;
    receiptImage: string;
    paymentMethod: 'instapay' | 'vcash';
    status: 'pending' | 'approved' | 'rejected';
    reviewedBy?: mongoose.Types.ObjectId;
    reviewDate?: Date;
    rejectionReason?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PaymentReceiptSchema: Schema = new Schema(
    {
        merchantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
        receiptImage: { type: String, required: true },
        paymentMethod: { type: String, enum: ['instapay', 'vcash'], required: true },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        reviewDate: { type: Date },
        rejectionReason: { type: String },
    },
    { timestamps: true }
);

export default mongoose.model<IPaymentReceipt>('PaymentReceipt', PaymentReceiptSchema);
