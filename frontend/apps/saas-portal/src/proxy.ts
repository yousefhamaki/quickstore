import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip middleware for Next.js internals, API routes, and static files
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/)
    ) {
        return NextResponse.next();
    }

    const token = request.cookies.get('token')?.value;
    const host = request.headers.get('host') || '';
    const hostname = host.split(':')[0]; // Normalize by removing port

    // Define main domains
    const mainDomains = [
        'localhost',
        '127.0.0.1',
        '[::1]',
        'quickstore.com',
        'quickstore.live',
        'www.quickstore.com',
        'www.quickstore.live',
        'api.quickstore.com',
        'buildora.live',
        'www.buildora.live'
    ];

    const isMainDomain = mainDomains.includes(hostname) || hostname.endsWith('.vercel.app');

    // Handle subdomain/custom domain routing (storefront)
    if (!isMainDomain) {
        // Precise extraction logic:
        let subdomain = '';
        if (hostname.endsWith('.quickstore.live') || hostname.endsWith('.quickstore.com') || hostname.endsWith('.buildora.live')) {
            subdomain = hostname.split('.')[0];
        } else if (hostname.includes('.') && !mainDomains.includes(hostname)) {
            // This is a custom domain mapped to the storefront!
            subdomain = hostname;
        } else {
            // Local dev testing fallback (e.g. hamaki.localhost:3000)
            const parts = hostname.split('.');
            if (parts.length > 1) {
                subdomain = parts[0];
            }
        }

        if (subdomain && subdomain !== 'www') {
            const segments = pathname.split('/');
            const isLocaleInPath = ['en', 'ar'].includes(segments[1]);

            // Check if we are already in the store path or a system path
            const pathToCheck = isLocaleInPath ? '/' + segments.slice(2).join('/') : pathname;
            const isSystemPath = ['/auth', '/merchant', '/dashboard', '/admin', '/api', '/_next'].some(p => pathToCheck.startsWith(p));
            const isAlreadyStorePath = isLocaleInPath ? segments[2] === 'store' : segments[1] === 'store';

            if (!isAlreadyStorePath && !isSystemPath) {
                const locale = isLocaleInPath ? segments[1] : 'en';
                const cleanPathname = isLocaleInPath
                    ? (segments.length > 2 ? '/' + segments.slice(2).join('/') : '/')
                    : pathname;

                // Rewrite to the storefront dynamic route, preserving query parameters
                const targetPath = `/${locale}/store/${subdomain}${cleanPathname === '/' ? '' : cleanPathname}${request.nextUrl.search}`;
                return NextResponse.rewrite(new URL(targetPath, request.url));
            }
        }
    }

    // Handle i18n routing
    return handleI18nRouting(request);
}

export const config = {
    // Exclude static resources and framework internals, but process dynamic files like robots.txt and sitemap.xml
    matcher: ['/((?!_next|static|public|favicon.ico|api|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|css|js)).*)']
};
