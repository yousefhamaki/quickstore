import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminAnalyticsSnapshot extends Document {
    date: Date;
    period: 'hourly' | 'daily' | 'monthly';
    mrr: number;
    revenue: number;
    merchants: number;
    stores: number;
    registrations: number;
    createdAt: Date;
}

const AdminAnalyticsSnapshotSchema = new Schema({
    date: { type: Date, required: true, index: true },
    period: { type: String, enum: ['hourly', 'daily', 'monthly'], required: true, index: true },
    mrr: { type: Number, required: true, default: 0 },
    revenue: { type: Number, required: true, default: 0 },
    merchants: { type: Number, required: true, default: 0 },
    stores: { type: Number, required: true, default: 0 },
    registrations: { type: Number, required: true, default: 0 }
}, { timestamps: { createdAt: true, updatedAt: false } });

AdminAnalyticsSnapshotSchema.index({ date: -1, period: 1 });

export default mongoose.model<IAdminAnalyticsSnapshot>('AdminAnalyticsSnapshot', AdminAnalyticsSnapshotSchema);
