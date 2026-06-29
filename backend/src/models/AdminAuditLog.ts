import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminAuditLog extends Document {
    actorId: mongoose.Types.ObjectId;
    action: string; // e.g. 'wallet.adjust', 'store.suspend'
    targetType: 'User' | 'Store' | 'SubscriptionPlan' | 'PaymentReceipt' | 'SupportTicket';
    targetId: mongoose.Types.ObjectId;
    beforeState: Record<string, any>;
    afterState: Record<string, any>;
    reason?: string;
    ipAddress?: string;
    createdAt: Date;
}

const AdminAuditLogSchema = new Schema({
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true },
    beforeState: { type: Schema.Types.Mixed, required: true },
    afterState: { type: Schema.Types.Mixed, required: true },
    reason: { type: String },
    ipAddress: { type: String }
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model<IAdminAuditLog>('AdminAuditLog', AdminAuditLogSchema);
