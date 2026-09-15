import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType =
    | 'order_created'
    | 'refund_requested'
    | 'review_submitted'
    | 'subscription_renewed'
    | 'subscription_past_due'
    | 'subscription_expired';

export interface INotification extends Document {
    userId: mongoose.Types.ObjectId; // the merchant who should see this
    storeId?: mongoose.Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    link?: string; // relative in-app path, e.g. /dashboard/stores/<id>/orders/<id>
    isRead: boolean;
    createdAt: Date;
}

const NotificationSchema: Schema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
    type: {
        type: String,
        required: true,
        enum: ['order_created', 'refund_requested', 'review_submitted', 'subscription_renewed', 'subscription_past_due', 'subscription_expired'],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

// Every real query here is "this user's notifications, newest first" or
// "this user's unread count" — one compound index serves both.
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
