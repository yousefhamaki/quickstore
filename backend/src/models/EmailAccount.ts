import mongoose, { Schema, Document } from 'mongoose';

export interface IEmailAccount extends Document {
    storeId: mongoose.Types.ObjectId;
    balance: number;          // total available (planBalance + purchasedBalance)
    planBalance: number;      // monthly plan allowance remaining
    purchasedBalance: number; // purchased add-on balance remaining
    reserved: number;
    lastRefreshedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const EmailAccountSchema: Schema = new Schema(
    {
        storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, unique: true },
        balance: { type: Number, default: 0 },          // Total = planBalance + purchasedBalance
        planBalance: { type: Number, default: 0 },      // Monthly plan quota
        purchasedBalance: { type: Number, default: 0 }, // Purchased add-ons
        reserved: { type: Number, default: 0 },
        lastRefreshedAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

// Indexes
EmailAccountSchema.index({ storeId: 1 }, { unique: true });

export default mongoose.model<IEmailAccount>('EmailAccount', EmailAccountSchema);
