import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

/**
 * Dynamic robots.txt generator
 * Ensures each store's sitemap is correctly referenced
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
    const headersList = await headers();
    const host = headersList.get('host') || '';

    // Check if we are on a store subdomain
    const isSubdomain = (host.includes('.localhost') && host.split('.').length > 1) ||
        (host.includes('.quickstore.com')) ||
        (host.includes('.quickstore.live'));

    let baseUrl = '';

    if (isSubdomain) {
        // Extract subdomain (e.g., hamaki from hamaki.quickstore.com:3000)
        const parts = host.split('.');
        const subdomain = parts[0];
        baseUrl = `https://${subdomain}.quickstore.live`;
    } else {
        // Default to main domain
        baseUrl = 'https://quickstore.live';
    }

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/admin/', '/dashboard/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
