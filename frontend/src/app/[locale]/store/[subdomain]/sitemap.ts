import { MetadataRoute } from 'next';
import { getPublicStore } from '@/services/publicStoreService';
import { getStoreProducts } from '@/services/publicStoreService';

/**
 * Dynamic XML Sitemap Generator
 * Generates SEO-optimized sitemap for each store
 * 
 * Route: /[locale]/store/[subdomain]/sitemap.xml
 */
export default async function sitemap(
    { params }: { params: Promise<{ subdomain: string; locale: string }> }
): Promise<MetadataRoute.Sitemap> {
    try {
        const { subdomain } = await params;

        // Get store data
        const store = await getPublicStore(subdomain);

        if (!store) {
            return [];
        }

        // Check if sitemap is enabled (check both old and new locations)
        const sitemapEnabled = (store as any).seo?.sitemapEnabled !== false &&
            store.settings?.marketing?.sitemapEnabled !== false;

        if (!sitemapEnabled) {
            return [];
        }

        // Determine base URL
        const baseUrl = store.domain.customDomain && (store.domain as any).isCustomDomainVerified
            ? `https://${store.domain.customDomain}`
            : `https://${store.domain.subdomain}.quickstore.live`;

        // Get all active products
        const products = await getStoreProducts((store as any)._id);
        const activeProducts = products.filter((p: any) => p.status === 'active');

        // Build sitemap entries
        const sitemapEntries: MetadataRoute.Sitemap = [
            // Homepage
            {
                url: baseUrl,
                lastModified: new Date(store.updatedAt),
                changeFrequency: 'daily',
                priority: 1.0,
            },
            // Products
            ...activeProducts.map((product: any) => ({
                url: `${baseUrl}/products/${product._id}`,
                lastModified: new Date(product.updatedAt),
                changeFrequency: 'weekly' as const,
                priority: 0.8,
            })),
        ];

        // Add policy pages if they exist
        if (store.settings?.policies?.privacyPolicy) {
            sitemapEntries.push({
                url: `${baseUrl}/policies/privacy`,
                lastModified: new Date(store.updatedAt),
                changeFrequency: 'monthly',
                priority: 0.3,
            });
        }

        if (store.settings?.policies?.termsOfService) {
            sitemapEntries.push({
                url: `${baseUrl}/policies/terms`,
                lastModified: new Date(store.updatedAt),
                changeFrequency: 'monthly',
                priority: 0.3,
            });
        }

        if (store.settings?.policies?.returnPolicy) {
            sitemapEntries.push({
                url: `${baseUrl}/policies/returns`,
                lastModified: new Date(store.updatedAt),
                changeFrequency: 'monthly',
                priority: 0.3,
            });
        }

        return sitemapEntries;

    } catch (error) {
        console.error('Sitemap generation error:', error);
        return [];
    }
}
