import express, { Response } from 'express';
import { protect, AuthRequest } from '../middleware/authMiddleware';
import Store from '../models/Store';
import Product from '../models/Product';

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
        const seoSettings = store.seo || {};
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
        const seoSettings = store.seo || {};
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

        // Calculate SEO health
        const products = await Product.find({ storeId: req.params.storeId });

        let score = 100;
        const issues: any[] = [];

        // Check global settings
        if (!store.seo?.metaTitle) {
            score -= 10;
            issues.push({
                type: 'critical',
                title: 'Missing Meta Title',
                description: 'Your store needs a meta title for better SEO',
                fix: 'Add a meta title in Global SEO Settings'
            });
        }

        if (!store.seo?.metaDescription) {
            score -= 10;
            issues.push({
                type: 'warning',
                title: 'Missing Meta Description',
                description: 'Add a meta description to improve click-through rates',
                fix: 'Add a meta description in Global SEO Settings'
            });
        }

        // Check products
        const productsWithoutSEO = products.filter(p => !p.seo?.title);
        if (productsWithoutSEO.length > 0) {
            score -= Math.min(20, productsWithoutSEO.length * 2);
            issues.push({
                type: 'suggestion',
                title: `${productsWithoutSEO.length} Products Missing SEO`,
                description: 'Optimize product titles and descriptions for search engines',
                fix: 'Edit product SEO in the Product SEO tab'
            });
        }

        const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

        // Categorize issues by type
        const categorizedIssues = {
            critical: issues.filter(i => i.type === 'critical').map(i => ({
                message: i.title,
                fix: i.fix,
                affectedPages: []
            })),
            warnings: issues.filter(i => i.type === 'warning').map(i => ({
                message: i.title,
                fix: i.fix,
                affectedPages: []
            })),
            suggestions: issues.filter(i => i.type === 'suggestion').map(i => ({
                message: i.title,
                fix: i.fix,
                affectedPages: []
            }))
        };

        res.json({
            health: {
                score: Math.max(0, score),
                grade,
                issues: categorizedIssues,
                metrics: {
                    totalPages: products.length + 1,
                    indexedPages: store.seo?.allowIndexing ? products.length + 1 : 0,
                    pagesWithMissingTitles: productsWithoutSEO.length,
                    pagesWithDuplicateTitles: 0
                },
                lastCheckedAt: new Date()
            }
        });
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

        // Same logic as GET
        const products = await Product.find({ storeId: req.params.storeId });

        let score = 100;
        const issues: any[] = [];

        if (!store.seo?.metaTitle) {
            score -= 10;
            issues.push({
                type: 'critical',
                title: 'Missing Meta Title',
                description: 'Your store needs a meta title for better SEO',
                fix: 'Add a meta title in Global SEO Settings'
            });
        }

        if (!store.seo?.metaDescription) {
            score -= 10;
            issues.push({
                type: 'warning',
                title: 'Missing Meta Description',
                description: 'Add a meta description to improve click-through rates',
                fix: 'Add a meta description in Global SEO Settings'
            });
        }

        const productsWithoutSEO = products.filter(p => !p.seo?.title);
        if (productsWithoutSEO.length > 0) {
            score -= Math.min(20, productsWithoutSEO.length * 2);
            issues.push({
                type: 'suggestion',
                title: `${productsWithoutSEO.length} Products Missing SEO`,
                description: 'Optimize product titles and descriptions for search engines',
                fix: 'Edit product SEO in the Product SEO tab'
            });
        }

        const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

        // Categorize issues by type
        const categorizedIssues = {
            critical: issues.filter(i => i.type === 'critical').map(i => ({
                message: i.title,
                fix: i.fix,
                affectedPages: []
            })),
            warnings: issues.filter(i => i.type === 'warning').map(i => ({
                message: i.title,
                fix: i.fix,
                affectedPages: []
            })),
            suggestions: issues.filter(i => i.type === 'suggestion').map(i => ({
                message: i.title,
                fix: i.fix,
                affectedPages: []
            }))
        };

        res.json({
            health: {
                score: Math.max(0, score),
                grade,
                issues: categorizedIssues,
                metrics: {
                    totalPages: products.length + 1,
                    indexedPages: store.seo?.allowIndexing ? products.length + 1 : 0,
                    pagesWithMissingTitles: productsWithoutSEO.length,
                    pagesWithDuplicateTitles: 0
                },
                lastCheckedAt: new Date()
            }
        });
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

        // Format for SEO Center
        const productsWithSEO = products.map(p => ({
            productId: p._id,
            name: p.name,
            seo: p.seo || {}
        }));

        res.json({ products: productsWithSEO });
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
