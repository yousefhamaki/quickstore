import { Response } from 'express';
import Store from '../models/Store';
import { AuthRequest } from '../middleware/authMiddleware';

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

        // Force mark as modified for nested objects if necessary, though direct assignment usually works
        store.markModified('settings.marketing');
        await store.save();

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
}
