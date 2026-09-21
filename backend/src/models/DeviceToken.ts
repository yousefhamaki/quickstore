import mongoose, { Schema, Document } from 'mongoose';

/**
 * One document per mobile device registered for push notifications (the
 * mobile-merchant Expo app). `expoPushToken` is unique across the whole
 * collection (not just per-user) — re-registering the same physical device
 * (e.g. after a re-login, possibly as a different user on a shared device)
 * upserts in place rather than accumulating stale duplicate rows pointing
 * at the same device.
 */
export interface IDeviceToken extends Document {
    userId: mongoose.Types.ObjectId;
    expoPushToken: string;
    platform: 'ios' | 'android';
    lastSeenAt: Date;
    createdAt: Date;
}

const DeviceTokenSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    expoPushToken: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['ios', 'android'], required: true },
    lastSeenAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IDeviceToken>('DeviceToken', DeviceTokenSchema);
