import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export function middleware(request: NextRequest) {
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

    const isMerchantPath = pathWithoutLocale.startsWith('/merchant');
    const isDashboardPath = pathWithoutLocale.startsWith('/dashboard');
    const isAdminPath = pathWithoutLocale.startsWith('/admin');
    const isAuthPath = pathWithoutLocale.startsWith('/auth');
    const isStorePath = pathWithoutLocale.startsWith('/store');

    // Redirect unauthenticated users to login
    // CRITICAL: Ensure store paths NEVER trigger this
    if ((isMerchantPath || isDashboardPath || isAdminPath) && !isStorePath && !token) {
        const locale = isLocaleInPath ? pathnameLocale : 'en';
        return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
    }

    // Redirect authenticated users away from auth pages
    if (token && isAuthPath) {
        const locale = isLocaleInPath ? pathnameLocale : 'en';
        return NextResponse.redirect(new URL(`/${locale}/merchant`, request.url));
    }

    // Handle i18n routing
    return handleI18nRouting(request);
}

export const config = {
    matcher: ['/((?!_next|api|.*\\..*).*)']
};
