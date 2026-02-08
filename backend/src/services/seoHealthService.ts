import Store from '../models/Store';
import Product from '../models/Product';
import SEOHealth, { ISEOIssue, ISEOHealth } from '../models/SEOHealth';

/**
 * SEO Health Service
 * Analyzes store SEO and provides actionable recommendations
 * Shopify-level SEO health checking
 */
export class SEOHealthService {
    /**
     * Run comprehensive SEO health check for a store
     */
    async checkStoreHealth(storeId: string): Promise<ISEOHealth> {
        const store = await Store.findById(storeId);
        if (!store) {
            throw new Error('Store not found');
        }

        const products = await Product.find({ storeId, isActive: true });

        const issues: { critical: ISEOIssue[], warnings: ISEOIssue[], suggestions: ISEOIssue[] } = {
            critical: [],
            warnings: [],
            suggestions: []
        };

        // ========================================
        // STORE-LEVEL CHECKS
        // ========================================

        // Check 1: Store meta title
        if (!store.settings.marketing?.seoTitle) {
            issues.warnings.push({
                type: 'missing_title',
                severity: 'warning',
                message: 'Store meta title not set',
                affectedPages: [{ pageType: 'homepage', url: '/' }],
                fix: 'Set a custom SEO title in Settings → Marketing → SEO'
            });
        }

        // Check 2: Store meta description
        if (!store.settings.marketing?.seoDescription) {
            issues.warnings.push({
                type: 'missing_description',
                severity: 'warning',
                message: 'Store meta description not set',
                affectedPages: [{ pageType: 'homepage', url: '/' }],
                fix: 'Set a custom SEO description in Settings → Marketing → SEO'
            });
        }

        // Check 3: Store published status
        if (store.status !== 'live') {
            issues.critical.push({
                type: 'noindex_important',
                severity: 'critical',
                message: 'Store is not live - search engines cannot index it',
                affectedPages: [{ pageType: 'homepage', url: '/' }],
                fix: 'Publish your store in Settings → General'
            });
        }

        // ========================================
        // PRODUCT-LEVEL CHECKS
        // ========================================

        // Check 4: Products missing SEO titles
        const productsWithoutTitle = products.filter(p => !p.seo?.title);
        if (productsWithoutTitle.length > 0) {
            issues.warnings.push({
                type: 'missing_title',
                severity: 'warning',
                message: `${productsWithoutTitle.length} product(s) missing custom SEO titles`,
                affectedPages: productsWithoutTitle.slice(0, 10).map(p => ({
                    pageType: 'product',
                    pageId: p._id.toString(),
                    url: `/products/${p.slug}`
                })),
                fix: 'Add custom SEO titles in product settings. Defaults to product name if not set.'
            });
        }

        // Check 5: Products missing SEO descriptions
        const productsWithoutDescription = products.filter(p => !p.seo?.description);
        if (productsWithoutDescription.length > 0) {
            issues.warnings.push({
                type: 'missing_description',
                severity: 'warning',
                message: `${productsWithoutDescription.length} product(s) missing custom SEO descriptions`,
                affectedPages: productsWithoutDescription.slice(0, 10).map(p => ({
                    pageType: 'product',
                    pageId: p._id.toString(),
                    url: `/products/${p.slug}`
                })),
                fix: 'Add custom SEO descriptions in product settings. Defaults to product description if not set.'
            });
        }

        // Check 6: Duplicate product titles
        const titleCounts = new Map<string, typeof products>();
        products.forEach(p => {
            const title = (p.seo?.title || p.name).toLowerCase().trim();
            if (!titleCounts.has(title)) {
                titleCounts.set(title, []);
            }
            titleCounts.get(title)!.push(p);
        });

        let duplicateTitleCount = 0;
        titleCounts.forEach((prods, title) => {
            if (prods.length > 1) {
                duplicateTitleCount++;
                issues.critical.push({
                    type: 'duplicate_title',
                    severity: 'critical',
                    message: `Duplicate SEO title: "${title}" used on ${prods.length} products`,
                    affectedPages: prods.map(p => ({
                        pageType: 'product',
                        pageId: p._id.toString(),
                        url: `/products/${p.slug}`
                    })),
                    fix: 'Make each product SEO title unique to avoid search engine confusion'
                });
            }
        });

        // Check 7: Duplicate product descriptions
        const descriptionCounts = new Map<string, typeof products>();
        products.forEach(p => {
            const desc = (p.seo?.description || p.description || '').toLowerCase().trim();
            if (desc && desc.length > 20) { // Only check meaningful descriptions
                if (!descriptionCounts.has(desc)) {
                    descriptionCounts.set(desc, []);
                }
                descriptionCounts.get(desc)!.push(p);
            }
        });

        let duplicateDescriptionCount = 0;
        descriptionCounts.forEach((prods, desc) => {
            if (prods.length > 1) {
                duplicateDescriptionCount++;
                issues.warnings.push({
                    type: 'duplicate_description',
                    severity: 'warning',
                    message: `Duplicate SEO description used on ${prods.length} products`,
                    affectedPages: prods.slice(0, 5).map(p => ({
                        pageType: 'product',
                        pageId: p._id.toString(),
                        url: `/products/${p.slug}`
                    })),
                    fix: 'Write unique descriptions for each product'
                });
            }
        });

        // Check 8: Title length optimization
        const titlesToolong = products.filter(p => {
            const title = p.seo?.title || p.name;
            return title.length > 60;
        });

        if (titlesToolong.length > 0) {
            issues.suggestions.push({
                type: 'title_too_long',
                severity: 'suggestion',
                message: `${titlesToolong.length} product(s) have titles longer than 60 characters`,
                affectedPages: titlesToolong.slice(0, 10).map(p => ({
                    pageType: 'product',
                    pageId: p._id.toString(),
                    url: `/products/${p.slug}`
                })),
                fix: 'Keep titles under 60 characters for better display in search results'
            });
        }

        // Check 9: Description length optimization
        const descriptionsTooLong = products.filter(p => {
            const desc = p.seo?.description || p.description || '';
            return desc.length > 160;
        });

        if (descriptionsTooLong.length > 0) {
            issues.suggestions.push({
                type: 'description_too_long',
                severity: 'suggestion',
                message: `${descriptionsTooLong.length} product(s) have descriptions longer than 160 characters`,
                affectedPages: descriptionsTooLong.slice(0, 10).map(p => ({
                    pageType: 'product',
                    pageId: p._id.toString(),
                    url: `/products/${p.slug}`
                })),
                fix: 'Keep descriptions under 160 characters for better display in search results'
            });
        }

        // ========================================
        // CALCULATE METRICS
        // ========================================

        const totalPages = products.length + 1; // +1 for homepage
        const indexedPages = products.filter(p => p.status === 'active').length + (store.status === 'live' ? 1 : 0);

        const avgTitleLength = products.length > 0
            ? products.reduce((sum, p) => sum + (p.seo?.title || p.name).length, 0) / products.length
            : 0;

        const avgDescLength = products.length > 0
            ? products.reduce((sum, p) => sum + (p.seo?.description || p.description || '').length, 0) / products.length
            : 0;

        const metrics = {
            totalPages,
            indexedPages,
            pagesWithMissingTitles: productsWithoutTitle.length,
            pagesWithMissingDescriptions: productsWithoutDescription.length,
            pagesWithDuplicateTitles: duplicateTitleCount,
            pagesWithDuplicateDescriptions: duplicateDescriptionCount,
            averageTitleLength: Math.round(avgTitleLength),
            averageDescriptionLength: Math.round(avgDescLength)
        };

        // ========================================
        // CALCULATE SCORE
        // ========================================

        let score = 100;

        // Critical issues: -15 points each
        score -= issues.critical.length * 15;

        // Warnings: -5 points each
        score -= issues.warnings.length * 5;

        // Suggestions: -2 points each
        score -= issues.suggestions.length * 2;

        // Ensure score is between 0-100
        score = Math.max(0, Math.min(100, score));

        // Calculate grade
        const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

        // ========================================
        // SAVE HEALTH CHECK
        // ========================================

        const health = await SEOHealth.findOneAndUpdate(
            { storeId },
            {
                score,
                grade,
                issues,
                metrics,
                lastCheckedAt: new Date(),
                nextCheckAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Check again in 24 hours
            },
            { upsert: true, new: true }
        );

        return health;
    }

    /**
     * Get cached health check results
     */
    async getHealthCheck(storeId: string): Promise<ISEOHealth | null> {
        return await SEOHealth.findOne({ storeId });
    }

    /**
     * Check if health check is stale and needs refresh
     */
    async needsRefresh(storeId: string): Promise<boolean> {
        const health = await SEOHealth.findOne({ storeId });

        if (!health) return true;

        return new Date() >= health.nextCheckAt;
    }

    /**
     * Get or refresh health check
     */
    async getOrRefreshHealth(storeId: string): Promise<ISEOHealth> {
        const needsRefresh = await this.needsRefresh(storeId);

        if (needsRefresh) {
            return await this.checkStoreHealth(storeId);
        }

        const health = await this.getHealthCheck(storeId);
        if (!health) {
            return await this.checkStoreHealth(storeId);
        }

        return health;
    }
}

export default new SEOHealthService();
