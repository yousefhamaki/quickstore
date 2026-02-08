# 🚀 SEO Center Implementation Guide

## Quick Start

This guide will help you integrate the SEO Center into your Buildora/QuickStore application.

---

## 📦 What's Included

### Backend
- ✅ `SEOHealth` model - Tracks SEO score and issues
- ✅ `seoHealthService.ts` - Comprehensive SEO analysis
- ✅ Database migrations needed (see below)

### Frontend
- ✅ `sitemap.xml/route.ts` - Dynamic sitemap generator
- ✅ `robots.txt/route.ts` - Dynamic robots.txt
- ✅ `ProductStructuredData.tsx` - JSON-LD schema
- ✅ `seoHelpers.ts` - SEO utility functions

---

## 🔧 Step 1: Database Migrations

### Update Store Model

Add SEO settings to the Store model:

```typescript
// backend/src/models/Store.ts

// Add to IMarketingSettings interface (line 67)
export interface IMarketingSettings {
    // ... existing fields
    
    // SEO Settings (new)
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    ogImage?: {
        url: string;
        publicId: string;
    };
    allowIndexing?: boolean;
    sitemapEnabled?: boolean;
}

// Update schema (line 240)
marketing: {
    facebookPixelId: { type: String },
    googleAnalyticsId: { type: String },
    tiktokPixelId: { type: String },
    snapchatPixelId: { type: String },
    seoTitle: { type: String },
    seoDescription: { type: String },
    seoKeywords: [{ type: String }],
    ogImage: {
        url: { type: String },
        publicId: { type: String }
    },
    allowIndexing: { type: Boolean, default: true },
    sitemapEnabled: { type: Boolean, default: true }
}
```

### Update Product Model

Enhance product SEO (already exists, just extend):

```typescript
// backend/src/models/Product.ts

// Update ISEO interface (line 14)
export interface ISEO {
    title?: string;
    description?: string;
    keywords?: string[];
    
    // New fields
    canonicalUrl?: string;
    noindex?: boolean;
    nofollow?: boolean;
    structuredData?: {
        enabled?: boolean;
        brand?: string;
        gtin?: string;
        mpn?: string;
        condition?: 'NewCondition' | 'UsedCondition' | 'RefurbishedCondition';
        availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
    };
}

// Update schema (line 107)
seo: {
    title: { type: String },
    description: { type: String },
    keywords: [{ type: String }],
    canonicalUrl: { type: String },
    noindex: { type: Boolean, default: false },
    nofollow: { type: Boolean, default: false },
    structuredData: {
        enabled: { type: Boolean, default: true },
        brand: { type: String },
        gtin: { type: String },
        mpn: { type: String },
        condition: { 
            type: String, 
            enum: ['NewCondition', 'UsedCondition', 'RefurbishedCondition'],
            default: 'NewCondition'
        },
        availability: { 
            type: String, 
            enum: ['InStock', 'OutOfStock', 'PreOrder'],
            default: 'InStock'
        }
    }
}
```

---

## 🔧 Step 2: Backend API Routes

### Create SEO Health Endpoint

```typescript
// backend/src/routes/seoRoutes.ts

import express from 'express';
import { protect } from '../middleware/authMiddleware';
import seoHealthService from '../services/seoHealthService';

const router = express.Router();

// Get SEO health for a store
router.get('/health/:storeId', protect, async (req, res) => {
    try {
        const { storeId } = req.params;
        
        // Verify user owns this store
        const store = await Store.findById(storeId);
        if (!store || store.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        
        const health = await seoHealthService.getOrRefreshHealth(storeId);
        
        res.json({
            success: true,
            health
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get SEO health' 
        });
    }
});

// Force refresh SEO health
router.post('/health/:storeId/refresh', protect, async (req, res) => {
    try {
        const { storeId } = req.params;
        
        // Verify user owns this store
        const store = await Store.findById(storeId);
        if (!store || store.ownerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        
        const health = await seoHealthService.checkStoreHealth(storeId);
        
        res.json({
            success: true,
            health
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to refresh SEO health' 
        });
    }
});

export default router;
```

### Register Routes

```typescript
// backend/src/server.ts

import seoRoutes from './routes/seoRoutes';

// Add this line with other route registrations
app.use('/api/seo', seoRoutes);
```

---

## 🔧 Step 3: Frontend Integration

### Update Product Page Metadata

```typescript
// frontend/src/app/[locale]/store/[subdomain]/products/[productId]/page.tsx

import { Metadata } from 'next';
import { ProductStructuredData } from '@/components/seo/ProductStructuredData';
import { generateProductTitle, generateProductDescription, generateCanonicalUrl } from '@/lib/seoHelpers';

export async function generateMetadata({ params }): Promise<Metadata> {
    const product = await getProductDetails(params.productId);
    const store = await getPublicStore(params.subdomain);
    
    const title = generateProductTitle(product, store.name);
    const description = generateProductDescription(product);
    const canonical = generateCanonicalUrl(`/products/${product._id}`, store);
    
    return {
        title,
        description,
        
        robots: {
            index: !product.seo?.noindex && product.status === 'active' && store.status === 'live',
            follow: !product.seo?.nofollow
        },
        
        openGraph: {
            type: 'product',
            title,
            description,
            images: product.images?.map(img => img.url) || [],
            siteName: store.name
        },
        
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: product.images?.[0]?.url
        },
        
        alternates: {
            canonical
        }
    };
}

export default async function ProductPage({ params }) {
    const product = await getProductDetails(params.productId);
    const store = await getPublicStore(params.subdomain);
    
    return (
        <>
            {/* Add structured data */}
            <ProductStructuredData product={product} store={store} />
            
            {/* Rest of your product page */}
            <div className="container">
                {/* ... existing product UI ... */}
            </div>
        </>
    );
}
```

### Update Store Layout Metadata

```typescript
// frontend/src/app/[locale]/store/[subdomain]/layout.tsx

import { Metadata } from 'next';

export async function generateMetadata({ params }): Promise<Metadata> {
    const store = await getPublicStore(params.subdomain);
    const seo = store.settings?.marketing;
    
    return {
        title: {
            default: seo?.seoTitle || `${store.name} - Online Store`,
            template: `%s | ${store.name}`
        },
        description: seo?.seoDescription || store.description || `Shop at ${store.name}`,
        keywords: seo?.seoKeywords || [store.category, 'online store'].filter(Boolean),
        
        robots: {
            index: seo?.allowIndexing !== false && store.status === 'live',
            follow: true
        },
        
        openGraph: {
            type: 'website',
            siteName: store.name,
            images: seo?.ogImage ? [seo.ogImage.url] : store.logo ? [store.logo.url] : []
        },
        
        twitter: {
            card: 'summary_large_image'
        }
    };
}
```

---

## 🔧 Step 4: Create SEO Dashboard UI

### SEO Health Dashboard Component

```typescript
// frontend/src/components/merchant/SEOHealthDashboard.tsx

'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface SEOHealthDashboardProps {
    storeId: string;
}

export function SEOHealthDashboard({ storeId }: SEOHealthDashboardProps) {
    const [health, setHealth] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        fetchHealth();
    }, [storeId]);
    
    const fetchHealth = async () => {
        try {
            const response = await fetch(`/api/seo/health/${storeId}`);
            const data = await response.json();
            setHealth(data.health);
        } catch (error) {
            console.error('Failed to fetch SEO health:', error);
        } finally {
            setLoading(false);
        }
    };
    
    if (loading) {
        return <div>Loading SEO health...</div>;
    }
    
    if (!health) {
        return <div>No SEO data available</div>;
    }
    
    return (
        <div className="space-y-6">
            {/* Score Card */}
            <div className="bg-white rounded-lg p-6 shadow">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">SEO Health Score</h2>
                        <p className="text-gray-600">Last checked: {new Date(health.lastCheckedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="text-center">
                        <div className={`text-6xl font-black ${getScoreColor(health.score)}`}>
                            {health.score}
                        </div>
                        <div className="text-2xl font-bold text-gray-600">
                            Grade: {health.grade}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Issues */}
            <div className="space-y-4">
                {health.issues.critical.length > 0 && (
                    <IssueSection 
                        title="Critical Issues" 
                        issues={health.issues.critical}
                        icon={<AlertCircle className="text-red-500" />}
                        color="red"
                    />
                )}
                
                {health.issues.warnings.length > 0 && (
                    <IssueSection 
                        title="Warnings" 
                        issues={health.issues.warnings}
                        icon={<AlertTriangle className="text-yellow-500" />}
                        color="yellow"
                    />
                )}
                
                {health.issues.suggestions.length > 0 && (
                    <IssueSection 
                        title="Suggestions" 
                        issues={health.issues.suggestions}
                        icon={<Info className="text-blue-500" />}
                        color="blue"
                    />
                )}
                
                {health.issues.critical.length === 0 && 
                 health.issues.warnings.length === 0 && 
                 health.issues.suggestions.length === 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-center gap-4">
                        <CheckCircle className="text-green-500" size={32} />
                        <div>
                            <h3 className="font-bold text-green-900">Perfect SEO!</h3>
                            <p className="text-green-700">Your store has no SEO issues.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function IssueSection({ title, issues, icon, color }: any) {
    return (
        <div className={`bg-${color}-50 border border-${color}-200 rounded-lg p-6`}>
            <div className="flex items-center gap-3 mb-4">
                {icon}
                <h3 className="font-bold text-lg">{title}</h3>
            </div>
            <div className="space-y-3">
                {issues.map((issue: any, index: number) => (
                    <div key={index} className="bg-white rounded p-4">
                        <p className="font-semibold">{issue.message}</p>
                        <p className="text-sm text-gray-600 mt-1">{issue.fix}</p>
                        {issue.affectedPages.length > 0 && (
                            <p className="text-xs text-gray-500 mt-2">
                                Affects {issue.affectedPages.length} page(s)
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function getScoreColor(score: number): string {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 60) return 'text-orange-600';
    return 'text-red-600';
}
```

---

## ✅ Testing Checklist

### Sitemap
- [ ] Visit `https://yourstore.buildora.app/sitemap.xml`
- [ ] Verify all active products are listed
- [ ] Check lastmod dates are correct
- [ ] Verify images are included

### Robots.txt
- [ ] Visit `https://yourstore.buildora.app/robots.txt`
- [ ] Verify indexing rules match store status
- [ ] Check sitemap reference is correct

### Product SEO
- [ ] View product page source
- [ ] Verify meta title and description
- [ ] Check JSON-LD structured data
- [ ] Verify Open Graph tags

### SEO Health
- [ ] Run health check
- [ ] Verify score calculation
- [ ] Check issue detection
- [ ] Test fix suggestions

---

## 🚀 Deployment

1. **Run database migrations** (update Store and Product models)
2. **Deploy backend** with new SEO routes
3. **Deploy frontend** with sitemap/robots routes
4. **Test on staging** before production
5. **Submit sitemaps** to Google Search Console

---

## 📊 Success Metrics

After deployment, monitor:
- SEO health scores across stores
- Sitemap generation performance
- Search engine indexing rates
- Organic traffic growth

---

**Status:** Ready for Implementation ✅
