# SEO Center Backend - Quick Implementation Guide

## Overview

You need to implement 6 API endpoints for the SEO Center to work.

---

## Step 1: Update Store Model

Add SEO settings to your Store schema:

**File:** `backend/src/models/Store.ts`

```typescript
// Add to IStore interface
seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    ogType?: string;
    ogImage?: string;
    twitterCard?: string;
    twitterUsername?: string;
    allowIndexing: boolean;
    sitemapEnabled: boolean;
};
```

```typescript
// Add to StoreSchema
seo: {
    metaTitle: { type: String },
    metaDescription: { type: String },
    keywords: [{ type: String }],
    ogType: { type: String, default: 'website' },
    ogImage: { type: String },
    twitterCard: { type: String, default: 'summary_large_image' },
    twitterUsername: { type: String },
    allowIndexing: { type: Boolean, default: true },
    sitemapEnabled: { type: Boolean, default: true }
},
```

---

## Step 2: Create SEO Routes

**File:** `backend/src/routes/seo.ts`

```typescript
import express from 'express';
import { protect } from '../middleware/auth';
import Store from '../models/Store';
import Product from '../models/Product';

const router = express.Router();

// GET /api/stores/:storeId/seo/settings
router.get('/stores/:storeId/seo/settings', protect, async (req, res) => {
    try {
        const store = await Store.findById(req.params.storeId);
        
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Check ownership
        if (store.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        res.json({
            settings: store.seo || {
                allowIndexing: true,
                sitemapEnabled: true
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// PUT /api/stores/:storeId/seo/settings
router.put('/stores/:storeId/seo/settings', protect, async (req, res) => {
    try {
        const store = await Store.findById(req.params.storeId);
        
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Check ownership
        if (store.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Update SEO settings
        store.seo = {
            ...store.seo,
            ...req.body
        };

        await store.save();

        res.json({ settings: store.seo });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET /api/seo/health/:storeId
router.get('/seo/health/:storeId', protect, async (req, res) => {
    try {
        const store = await Store.findById(req.params.storeId);
        
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Check ownership
        if (store.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Calculate SEO health (simplified version)
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

        res.json({
            health: {
                score: Math.max(0, score),
                grade,
                issues,
                metrics: {
                    totalPages: products.length + 1, // products + homepage
                    indexedPages: store.seo?.allowIndexing ? products.length + 1 : 0,
                    missingTitles: productsWithoutSEO.length,
                    duplicateTitles: 0
                },
                lastChecked: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// POST /api/seo/health/:storeId/refresh
router.post('/seo/health/:storeId/refresh', protect, async (req, res) => {
    // Same as GET but forces recalculation
    try {
        const store = await Store.findById(req.params.storeId);
        
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        if (store.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Same logic as GET /seo/health/:storeId
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

        res.json({
            health: {
                score: Math.max(0, score),
                grade,
                issues,
                metrics: {
                    totalPages: products.length + 1,
                    indexedPages: store.seo?.allowIndexing ? products.length + 1 : 0,
                    missingTitles: productsWithoutSEO.length,
                    duplicateTitles: 0
                },
                lastChecked: new Date()
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// GET /api/stores/:storeId/products?includeSEO=true
// (This might already exist - just ensure it includes SEO data)
router.get('/stores/:storeId/products', protect, async (req, res) => {
    try {
        const store = await Store.findById(req.params.storeId);
        
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        if (store.userId.toString() !== req.user._id.toString()) {
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
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// PUT /api/stores/:storeId/products/:productId/seo
router.put('/stores/:storeId/products/:productId/seo', protect, async (req, res) => {
    try {
        const store = await Store.findById(req.params.storeId);
        
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        if (store.userId.toString() !== req.user._id.toString()) {
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
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
```

---

## Step 3: Register Routes

**File:** `backend/src/server.ts` or `backend/src/app.ts`

```typescript
import seoRoutes from './routes/seo';

// Add with other routes
app.use('/api', seoRoutes);
```

---

## Step 4: Update Product Model (if needed)

Ensure your Product model has SEO fields:

```typescript
// In Product schema
seo: {
    title: { type: String },
    description: { type: String },
    keywords: [{ type: String }],
    canonicalUrl: { type: String },
    noindex: { type: Boolean, default: false },
    structuredData: { type: Object }
}
```

---

## Testing

1. **Restart backend server**
2. **Refresh SEO Center page**
3. **Blue banner should disappear**
4. **Try saving settings** - should work!
5. **Check SEO health** - should show score

---

## Quick Start Commands

```bash
# 1. Update models
# Edit backend/src/models/Store.ts
# Edit backend/src/models/Product.ts (if needed)

# 2. Create routes file
# Create backend/src/routes/seo.ts (copy code above)

# 3. Register routes
# Edit backend/src/server.ts or app.ts

# 4. Restart server
cd backend
npm run dev
```

---

## Verification Checklist

- [ ] Store model has `seo` field
- [ ] Product model has `seo` field
- [ ] SEO routes file created
- [ ] Routes registered in server
- [ ] Server restarted
- [ ] Frontend shows no blue banner
- [ ] Can save global SEO settings
- [ ] Can view SEO health score
- [ ] Can update product SEO

---

## Estimated Time

- **Model updates:** 5 minutes
- **Routes implementation:** 15 minutes
- **Testing:** 10 minutes
- **Total:** ~30 minutes

---

## Need Help?

Refer to:
- `SEO_CENTER_ARCHITECTURE.md` - Full architecture
- `SEO_CENTER_FRONTEND_SUMMARY.md` - Frontend details
- `backend/src/models/SEOHealth.ts` - SEO Health model (already created)

---

**Status:** Ready to implement  
**Complexity:** Low-Medium  
**Impact:** High (enables full SEO Center functionality)
