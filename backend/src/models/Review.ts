import mongoose, { Schema, Document } from 'mongoose';

export interface IMerchantReply {
    message: string;
    repliedAt: Date;
}

export interface IReview extends Document {
    storeId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    orderId: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    customerName: string; // denormalized display name (e.g. "Yousef H.") — reviews are public, never show a full email
    rating: number;
    title?: string;
    comment: string;
    status: 'pending' | 'approved' | 'rejected';
    merchantReply?: IMerchantReply;
    createdAt: Date;
    updatedAt: Date;
}

const ReviewSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
        productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
        customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        customerName: { type: String, required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        title: { type: String },
        comment: { type: String, required: true },
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        merchantReply: {
            message: { type: String },
            repliedAt: { type: Date },
        },
    },
    { timestamps: true }
);

// A given order can only produce one review per product — this is what
// "verified purchase" actually means here (see reviewController.ts): the
// review is created from a specific delivered order, not from a free-typed
// claim, so a customer who buys the same product again in a NEW order can
// leave a fresh review, but can't spam multiple reviews off one purchase.
ReviewSchema.index({ storeId: 1, productId: 1, orderId: 1 }, { unique: true });
ReviewSchema.index({ storeId: 1, productId: 1, status: 1, createdAt: -1 });

export default mongoose.model<IReview>('Review', ReviewSchema);
