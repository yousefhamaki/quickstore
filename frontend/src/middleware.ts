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
    const hostname = request.headers.get('host') || '';

    // Define main domains
    const mainDomains = [
        'localhost:3000',
        'localhost:3001',
        'quickstore.com',
        'www.quickstore.com',
        'api.quickstore.com',
        'quickstore.live',
        'www.quickstore.live'
    ];

    const isMainDomain = mainDomains.includes(hostname);

    // Handle subdomain routing (storefront)
    if (!isMainDomain) {
        const subdomain = hostname.split('.')[0];
        if (subdomain && subdomain !== 'www') {
            return NextResponse.rewrite(
                new URL(`/store/${subdomain}${pathname === '/' ? '' : pathname}`, request.url)
            );
        }
    }

    // Extract locale from pathname
    const pathnameLocale = pathname.split('/')[1];
    const isLocaleInPath = ['en', 'ar'].includes(pathnameLocale);

    // Auth redirects - check paths without locale prefix
    const pathWithoutLocale = isLocaleInPath ? pathname.substring(3) : pathname;

    const isMerchantPath = pathWithoutLocale.startsWith('/merchant');
    const isDashboardPath = pathWithoutLocale.startsWith('/dashboard');
    const isAdminPath = pathWithoutLocale.startsWith('/admin');
    const isAuthPath = pathWithoutLocale.startsWith('/auth');

    // Redirect unauthenticated users to login
    if ((isMerchantPath || isDashboardPath || isAdminPath) && !token) {
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
