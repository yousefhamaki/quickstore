import { NextRequest, NextResponse } from 'next/server';
import { getPublicStore } from '@/services/publicStoreService';
import { getStoreProducts } from '@/services/publicStoreService';

/**
 * Dynamic XML Sitemap Generator
 * Generates SEO-optimized sitemap for each store
 * 
 * Route: /[locale]/store/[subdomain]/sitemap.xml
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

        // Check if sitemap is enabled (check both old and new locations)
        const sitemapEnabled = store.seo?.sitemapEnabled !== false &&
            store.settings?.marketing?.sitemapEnabled !== false;

        if (!sitemapEnabled) {
            return new NextResponse('Sitemap disabled for this store', { status: 404 });
        }

        // Determine base URL
        const baseUrl = store.domain.customDomain && store.domain.isCustomDomainVerified
            ? `https://${store.domain.customDomain}`
            : `https://${store.domain.subdomain}.buildora.app`;

        // Get all active products
        const products = await getStoreProducts(subdomain);
        const activeProducts = products.filter((p: any) => p.status === 'active');

        // Build sitemap XML
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    
    <!-- Homepage -->
    <url>
        <loc>${baseUrl}</loc>
        <lastmod>${new Date(store.updatedAt).toISOString()}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>

    <!-- Products -->
    ${activeProducts.map((product: any) => `
    <url>
        <loc>${baseUrl}/products/${product._id}</loc>
        <lastmod>${new Date(product.updatedAt).toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
        ${product.images && product.images.length > 0 ? `
        <image:image>
            <image:loc>${product.images[0].url}</image:loc>
            <image:title>${escapeXml(product.name)}</image:title>
        </image:image>` : ''}
    </url>`).join('')}

    <!-- Policies (if exist) -->
    ${store.settings?.policies?.privacyPolicy ? `
    <url>
        <loc>${baseUrl}/policies/privacy</loc>
        <lastmod>${new Date(store.updatedAt).toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.3</priority>
    </url>` : ''}
    
    ${store.settings?.policies?.termsOfService ? `
    <url>
        <loc>${baseUrl}/policies/terms</loc>
        <lastmod>${new Date(store.updatedAt).toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.3</priority>
    </url>` : ''}
    
    ${store.settings?.policies?.returnPolicy ? `
    <url>
        <loc>${baseUrl}/policies/returns</loc>
        <lastmod>${new Date(store.updatedAt).toISOString()}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.3</priority>
    </url>` : ''}

</urlset>`;

        return new NextResponse(sitemap, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
                'X-Robots-Tag': 'noindex' // Don't index the sitemap itself
            }
        });

    } catch (error) {
        console.error('Sitemap generation error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
