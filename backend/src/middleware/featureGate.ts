import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { canAccessFeature, FeatureKey } from '../config/planFeatures';

/**
 * Middleware to restrict access to features based on the store's subscription plan.
 * Requires billingContext middleware to be called first.
 */
export const requireFeature = (feature: FeatureKey) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const sub = req.subscription;

        if (!sub || !sub.planId) {
            return res.status(403).json({
                success: false,
                message: 'No active plan found. Please subscribe to access this feature.',
                code: 'NO_PLAN'
            });
        }

        // Active check
        if (sub.status !== 'active') {
            return res.status(403).json({
                success: false,
                message: 'Your subscription is not active. Please complete payment to access this feature.',
                code: 'SUBSCRIPTION_INACTIVE'
            });
        }

        const planName = (sub.planId as any).name;

        if (!canAccessFeature(planName, feature)) {
            return res.status(403).json({
                success: false,
                message: `The '${feature}' feature is not included in your current plan. Please upgrade to unlock.`,
                code: 'FEATURE_LOCKED',
                feature
            });
        }

        next();
    };
};
