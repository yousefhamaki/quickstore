import { Response } from 'express';
import Store from '../models/Store';
import { AuthRequest } from '../middleware/authMiddleware';
import { redisClient } from '../config/redis';
import { PLAN_MAPPING, PLAN_NAMES } from '../config/planFeatures';

// Helper for Zero Cache-Miss Redis update
const overwriteStoreCache = async (store: any) => {
    try {
        const plainStore = store.toObject();
        const cacheKey = `store_customization:${store.domain.subdomain}`;
        await redisClient.setex(cacheKey, 3600, JSON.stringify(plainStore));

        if (store.domain.customDomain) {
            const customCacheKey = `store_customization:${store.domain.customDomain}`;
            await redisClient.setex(customCacheKey, 3600, JSON.stringify(plainStore));
        }
    } catch (cacheErr) {
        console.warn(`[Redis Cache Overwrite Failed]`, cacheErr);
    }
};

// @desc    Update store pixels
// @route   PUT /api/marketing/pixels
// @access  Private/Merchant
export const updatePixels = async (req: AuthRequest, res: Response) => {
    try {
        const { storeId, facebookPixelId, googleAnalyticsId, tiktokPixelId, snapchatPixelId } = req.body;

        const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found or unauthorized' });
        }

        if (!store.settings.marketing) {
            store.settings.marketing = {};
        }

        store.settings.marketing.facebookPixelId = facebookPixelId;
        store.settings.marketing.googleAnalyticsId = googleAnalyticsId;
        store.settings.marketing.tiktokPixelId = tiktokPixelId;
        store.settings.marketing.snapchatPixelId = snapchatPixelId;

        store.markModified('settings.marketing');
        await store.save();

        // Zero Cache-Miss Overwrite
        await overwriteStoreCache(store);

        res.json({ success: true, marketing: store.settings.marketing });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};

// @desc    Update store SEO settings
// @route   PUT /api/marketing/seo
// @access  Private/Merchant
export const updateSEO = async (req: AuthRequest, res: Response) => {
    try {
        const { storeId, seoTitle, seoDescription } = req.body;

        const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found or unauthorized' });
        }

        if (!store.settings.marketing) {
            store.settings.marketing = {};
        }

        store.settings.marketing.seoTitle = seoTitle;
        store.settings.marketing.seoDescription = seoDescription;

        store.markModified('settings.marketing');
        await store.save();

        // Zero Cache-Miss Overwrite
        await overwriteStoreCache(store);

        res.json({ success: true, marketing: store.settings.marketing });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};

// @desc    Get marketing settings
// @route   GET /api/marketing/settings?storeId=...
// @access  Private/Merchant
export const getMarketingSettings = async (req: AuthRequest, res: Response) => {
    try {
        const { storeId } = req.query;
        const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });

        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found' });
        }

        res.json({ success: true, marketing: store.settings.marketing || {} });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};

// @desc    Update store Social Sharing settings
// @route   PUT /api/marketing/social-sharing
// @access  Private/Merchant
export const updateSocialSharing = async (req: AuthRequest, res: Response) => {
    try {
        const { storeId, enabled, platforms, defaultMessage } = req.body;

        const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found or unauthorized' });
        }

        if (!store.settings.marketing) {
            store.settings.marketing = {};
        }

        let finalPlatforms = platforms || [];
        let finalDefaultMessage = defaultMessage;

        // Perform plan gating checks
        const planName = req.subscription?.planId ? (req.subscription.planId as any).name : 'Free';
        const normalizedPlan = PLAN_MAPPING[planName] || PLAN_NAMES.STARTER;

        if (normalizedPlan === PLAN_NAMES.STARTER) {
            // Starter/Free plan is limited to copyLink & whatsapp, and locked defaultMessage
            finalPlatforms = finalPlatforms.filter((p: string) => ['copyLink', 'whatsapp'].includes(p));
            finalDefaultMessage = 'Check out this amazing product!';
        }

        store.settings.marketing.socialSharing = {
            enabled: !!enabled,
            platforms: finalPlatforms,
            defaultMessage: finalDefaultMessage
        };

        store.markModified('settings.marketing');
        await store.save();

        // Zero Cache-Miss Overwrite
        await overwriteStoreCache(store);

        res.json({ success: true, socialSharing: store.settings.marketing.socialSharing });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};
