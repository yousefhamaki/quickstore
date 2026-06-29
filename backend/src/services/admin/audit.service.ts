import mongoose from 'mongoose';
import AdminAuditLog from '../../models/AdminAuditLog';

export const logAdminAction = async (
    actorId: string | mongoose.Types.ObjectId,
    action: string,
    targetType: 'User' | 'Store' | 'SubscriptionPlan' | 'PaymentReceipt' | 'SupportTicket',
    targetId: string | mongoose.Types.ObjectId,
    beforeState: Record<string, any>,
    afterState: Record<string, any>,
    reason?: string,
    ipAddress?: string
) => {
    try {
        await AdminAuditLog.create({
            actorId: new mongoose.Types.ObjectId(actorId),
            action,
            targetType,
            targetId: new mongoose.Types.ObjectId(targetId),
            beforeState,
            afterState,
            reason,
            ipAddress
        });
    } catch (error) {
        console.error('[AuditService] Failed to create audit log:', error);
    }
};
