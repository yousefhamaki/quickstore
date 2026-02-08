import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getPublicStore, getStoreProducts } from '@/services/publicStoreService';

/**
 * Root-level sitemap with multi-tenancy support
 * Detects if accessed via store subdomain and serves store-specific URLs
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const headersList = await headers();
    const host = headersList.get('host') || '';

    // Check if we are on a store subdomain
    // Pattern: subdomain.quickstore.live or subdomain.localhost:3000
    const isSubdomain = (host.includes('.localhost') && host.split('.').length > 1) ||
        (host.includes('.quickstore.com')) ||
        (host.includes('.quickstore.live'));

    if (isSubdomain) {
        try {
            const subdomain = host.split('.')[0];
            const store = await getPublicStore(subdomain);

            if (store && (store as any).seo?.sitemapEnabled !== false) {
                // Force production domain for sitemap entries even when testing locally
                const liveDomain = 'quickstore.live';
                const baseUrl = `https://${subdomain}.${liveDomain}`;

                const products = await getStoreProducts((store as any)._id);
                const activeProducts = products.filter((p: any) => p.status === 'active');

                return [
                    {
                        url: baseUrl,
                        lastModified: new Date(store.updatedAt),
                        changeFrequency: 'daily',
                        priority: 1,
                    },
                    ...activeProducts.map((p: any) => ({
                        url: `${baseUrl}/en/products/${p._id}`,
                        lastModified: new Date(p.updatedAt),
                        changeFrequency: 'weekly' as const,
                        priority: 0.8,
                    }))
                ];
            }
        } catch (error) {
            console.error('Error generating dynamic sitemap:', error);
        }
    }

    // Default sitemap for the main platform
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quickstore.live';

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/en`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
    ];
}
