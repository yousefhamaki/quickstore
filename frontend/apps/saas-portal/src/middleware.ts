import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export default function middleware(request: NextRequest) {
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

    // Handle subdomain routing (storefront)
    if (!isMainDomain) {
        const subdomain = hostname.split('.')[0];
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

                return NextResponse.rewrite(
                    new URL(`/${locale}/store/${subdomain}${cleanPathname === '/' ? '' : cleanPathname}`, request.url)
                );
            }
        }
    }

    // Extract locale from pathname
    const pathnameLocale = pathname.split('/')[1];
    const isLocaleInPath = ['en', 'ar'].includes(pathnameLocale);

    // Auth redirects - check paths without locale prefix
    const pathWithoutLocale = isLocaleInPath ? (pathname.substring(3) || '/') : pathname;

    // Hand-off explicit dashboard, admin, and merchant links natively to the separated Merchant Dashboard app!
    const isSystemDashboardPath = ['/dashboard', '/merchant', '/admin'].some(p => pathWithoutLocale.startsWith(p));
    
    if (isSystemDashboardPath) {
        const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'http://localhost:3001';
        return NextResponse.redirect(new URL(`${dashboardUrl}${pathname}${request.nextUrl.search}`, request.url));
    }
    
    // Handle i18n routing
    return handleI18nRouting(request);
}

export const config = {
    matcher: ['/((?!_next|static|public|favicon.ico|api|.*\\..*).*)']
};
