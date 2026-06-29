import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

const POLICY_ROLES: Record<string, string[]> = {
    super_admin: [
        'analytics.view',
        'merchants.view', 'merchants.status', 'merchants.wallet',
        'stores.view', 'stores.status', 'stores.subscription',
        'receipts.view', 'receipts.review',
        'plans.view', 'plans.create', 'plans.update', 'plans.delete',
        'tickets.view', 'tickets.reply', 'tickets.status',
        'audit.view'
    ],
    finance_admin: [
        'analytics.view',
        'merchants.view', 'merchants.wallet',
        'stores.view',
        'receipts.view', 'receipts.review',
        'plans.view', 'plans.create', 'plans.update'
    ],
    support_admin: [
        'tickets.view', 'tickets.reply', 'tickets.status'
    ],
    read_only_admin: [
        'analytics.view',
        'merchants.view',
        'stores.view',
        'receipts.view',
        'plans.view',
        'tickets.view'
    ]
};

export const can = (permission: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const userRole = req.user?.role;
        if (!userRole) {
            return res.status(401).json({ message: 'Session invalid' });
        }
        const permissions = POLICY_ROLES[userRole] || [];
        if (!permissions.includes(permission)) {
            return res.status(403).json({ message: `Forbidden: Insufficient permissions for policy [${permission}]` });
        }
        next();
    };
};
