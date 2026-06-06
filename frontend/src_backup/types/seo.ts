/**
 * SEO Center Type Definitions
 * Production-ready types for SEO settings and health
 */

export interface SEOSettings {
    // Global Store SEO
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];

    // Open Graph
    ogImage?: {
        url: string;
        publicId: string;
    };
    ogType?: string;

    // Twitter Card
    twitterCard?: 'summary' | 'summary_large_image';
    twitterSite?: string;

    // Indexing
    allowIndexing?: boolean;
    sitemapEnabled?: boolean;
}

export interface ProductSEO {
    productId: string;
    productName: string;
    productSlug: string;
    seo: {
        title?: string;
        description?: string;
        keywords?: string[];
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
    };
}

export interface SEOIssue {
    type: string;
    severity: 'critical' | 'warning' | 'suggestion';
    message: string;
    affectedPages: {
        pageType: string;
        pageId?: string;
        url: string;
    }[];
    fix: string;
}

export interface SEOHealth {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    issues: {
        critical: SEOIssue[];
        warnings: SEOIssue[];
        suggestions: SEOIssue[];
    };
    metrics: {
        totalPages: number;
        indexedPages: number;
        pagesWithMissingTitles: number;
        pagesWithMissingDescriptions: number;
        pagesWithDuplicateTitles: number;
        pagesWithDuplicateDescriptions: number;
        averageTitleLength: number;
        averageDescriptionLength: number;
    };
    lastCheckedAt: string;
    nextCheckAt: string;
}

export interface SEOCenterData {
    settings: SEOSettings;
    health: SEOHealth | null;
    products: ProductSEO[];
}

export interface UpdateSEOSettingsPayload {
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords?: string[];
    ogImage?: {
        url: string;
        publicId: string;
    };
    ogType?: string;
    twitterCard?: 'summary' | 'summary_large_image';
    twitterSite?: string;
    allowIndexing?: boolean;
    sitemapEnabled?: boolean;
}

export interface UpdateProductSEOPayload {
    productId: string;
    seo: {
        title?: string;
        description?: string;
        keywords?: string[];
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
    };
}
