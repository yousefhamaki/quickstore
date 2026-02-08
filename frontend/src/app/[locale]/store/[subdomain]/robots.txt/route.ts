import { NextRequest, NextResponse } from 'next/server';
import { getPublicStore } from '@/services/publicStoreService';

/**
 * Dynamic robots.txt Generator
 * Generates SEO-safe robots.txt for each store
 * 
 * Route: /[locale]/store/[subdomain]/robots.txt
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ subdomain: string; locale: string }> }
) {
    try {
        const { subdomain } = await params;

        // Get store data
        const store = await getPublicStore(subdomain);

        if (!store) {
            return new NextResponse('Store not found', { status: 404 });
        }

        // Determine base URL
        const baseUrl = store.domain.customDomain && (store.domain as any).isCustomDomainVerified
            ? `https://${store.domain.customDomain}`
            : `https://${store.domain.subdomain}.quickstore.live`;

        // Determine if store should be indexed
        // Only allow indexing if store is live
        const allowIndexing = store.status === 'live';

        // Build robots.txt
        const robots = `# Robots.txt for ${store.name}
# Generated automatically by QuickStore

User-agent: *
${allowIndexing ? 'Allow: /' : 'Disallow: /'}

# Disallow checkout and cart pages (always)
Disallow: /checkout
Disallow: /cart
Disallow: /order/

# Disallow admin pages (if any)
Disallow: /admin

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay (be nice to servers)
Crawl-delay: 1
`;

        return new NextResponse(robots, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'public, max-age=86400, s-maxage=86400' // Cache for 24 hours
            }
        });

    } catch (error) {
        console.error('Robots.txt generation error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
