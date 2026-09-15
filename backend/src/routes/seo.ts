import express, { Response } from 'express';
import { protect, AuthRequest } from '../middleware/authMiddleware';
import Store from '../models/Store';
import Product from '../models/Product';
import seoHealthService from '../services/seoHealthService';

const router = express.Router();

// GET /api/stores/:storeId/seo/settings
router.get('/stores/:storeId/seo/settings', protect, async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findById(req.params.storeId);

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Check ownership
        if (store.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Map backend fields to frontend field names
        const seoSettings = (store.seo || {}) as any;
        res.json({
            settings: {
                seoTitle: seoSettings.metaTitle,
                seoDescription: seoSettings.metaDescription,
                seoKeywords: seoSettings.keywords,
                ogType: seoSettings.ogType || 'website',
                ogImage: seoSettings.ogImage,
                twitterCard: seoSettings.twitterCard || 'summary_large_image',
                twitterSite: seoSettings.twitterUsername,
                allowIndexing: seoSettings.allowIndexing !== false,
                sitemapEnabled: seoSettings.sitemapEnabled !== false
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// PUT /api/stores/:storeId/seo/settings
router.put('/stores/:storeId/seo/settings', protect, async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findById(req.params.storeId);

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Check ownership
        if (store.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Map frontend fields to backend fields
        const updates: any = {};
        if (req.body.seoTitle !== undefined) updates.metaTitle = req.body.seoTitle;
        if (req.body.seoDescription !== undefined) updates.metaDescription = req.body.seoDescription;
        if (req.body.seoKeywords !== undefined) updates.keywords = req.body.seoKeywords;
        if (req.body.ogType !== undefined) updates.ogType = req.body.ogType;
        if (req.body.ogImage !== undefined) updates.ogImage = req.body.ogImage;
        if (req.body.twitterCard !== undefined) updates.twitterCard = req.body.twitterCard;
        if (req.body.twitterSite !== undefined) updates.twitterUsername = req.body.twitterSite;
        if (req.body.allowIndexing !== undefined) updates.allowIndexing = req.body.allowIndexing;
        if (req.body.sitemapEnabled !== undefined) updates.sitemapEnabled = req.body.sitemapEnabled;

        // Update SEO settings
        store.seo = {
            ...store.seo,
            ...updates
        };

        await store.save();

        // Return with frontend field names
        const seoSettings = (store.seo || {}) as any;
        res.json({
            settings: {
                seoTitle: seoSettings.metaTitle,
                seoDescription: seoSettings.metaDescription,
                seoKeywords: seoSettings.keywords,
                ogType: seoSettings.ogType || 'website',
                ogImage: seoSettings.ogImage,
                twitterCard: seoSettings.twitterCard || 'summary_large_image',
                twitterSite: seoSettings.twitterUsername,
                allowIndexing: seoSettings.allowIndexing !== false,
                sitemapEnabled: seoSettings.sitemapEnabled !== false
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET /api/seo/health/:storeId
//
// Delegates to seoHealthService — the comprehensive, cached health-check
// implementation (9 real checks: missing/duplicate titles & descriptions,
// title/description length, unpublished store) backed by the SEOHealth
// model. This route used to carry its own separate, much simpler inline
// copy of this logic (3 checks, no persistence/caching, no duplicate
// detection) that disagreed with seoHealthService on which store field even
// holds the meta title — that duplicate implementation is now gone.
router.get('/seo/health/:storeId', protect, async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findById(req.params.storeId);

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Check ownership
        if (store.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const health = await seoHealthService.getOrRefreshHealth(req.params.storeId as string);
        res.json({ health });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// POST /api/seo/health/:storeId/refresh
router.post('/seo/health/:storeId/refresh', protect, async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findById(req.params.storeId);

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        if (store.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Force a fresh check (unlike GET, which reuses a cached result
        // until it goes stale) — this is the merchant explicitly clicking
        // "Refresh".
        const health = await seoHealthService.checkStoreHealth(req.params.storeId as string);
        res.json({ health });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET /api/stores/:storeId/products (with SEO data)
router.get('/stores/:storeId/products', protect, async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findById(req.params.storeId);

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        if (store.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const products = await Product.find({ storeId: req.params.storeId });

        // Format for SEO Center — field names must match the frontend's
        // ProductSEO type (productName/productSlug, not name/slug) or
        // ProductSEOList silently renders blank product names.
        const productsWithSEO = products.map(p => ({
            productId: p._id,
            productName: p.name,
            productSlug: p.slug,
            seo: p.seo || {}
        }));

        res.json({ products: productsWithSEO });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// POST /api/stores/:storeId/products/seo/generate-all
//
// Bulk-fills a default SEO title/description/keywords for every product in
// the store that doesn't have its own yet — from the product's own
// name/shortDescription/tags, truncated to search-engine-safe lengths.
// Products that already have a custom title AND description are left
// completely untouched; this only fills gaps, it never overwrites
// something a merchant deliberately wrote (same "leave blank to use
// product name/description" contract the Product SEO tab already
// documents — this is just doing it in bulk instead of one product at a
// time). This is what the SEO Center's "Auto-fill Missing SEO" button
// calls.
router.post('/stores/:storeId/products/seo/generate-all', protect, async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findById(req.params.storeId);

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        if (store.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const products = await Product.find({ storeId: req.params.storeId });
        let updatedCount = 0;

        for (const product of products) {
            const needsTitle = !product.seo?.title;
            const needsDescription = !product.seo?.description;
            const hasNoKeywords = !product.seo?.keywords || product.seo.keywords.length === 0;
            const candidateKeywords = product.tags && product.tags.length > 0 ? product.tags : undefined;
            const willAddKeywords = hasNoKeywords && !!candidateKeywords;

            // Skip entirely if there's nothing to actually add — e.g. a
            // product with custom title+description but no tags to draw
            // keywords from would otherwise get a pointless save() and
            // inflate updatedCount without changing anything.
            if (!needsTitle && !needsDescription && !willAddKeywords) continue;

            product.seo = {
                ...product.seo,
                title: product.seo?.title || product.name.slice(0, 60),
                description: product.seo?.description || (product.shortDescription || product.description || '').slice(0, 160),
                keywords: willAddKeywords ? candidateKeywords : product.seo?.keywords
            };
            await product.save();
            updatedCount++;
        }

        res.json({ updatedCount, totalProducts: products.length });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// PUT /api/stores/:storeId/products/:productId/seo
router.put('/stores/:storeId/products/:productId/seo', protect, async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findById(req.params.storeId);

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        if (store.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const product = await Product.findById(req.params.productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Verify product belongs to the store
        if (product.storeId.toString() !== store._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Update product SEO
        product.seo = {
            ...product.seo,
            ...req.body
        };

        await product.save();

        res.json({
            product: {
                productId: product._id,
                name: product.name,
                seo: product.seo
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
