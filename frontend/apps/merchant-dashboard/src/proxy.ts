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

    // Ignore wildcard subdomains as those are explicitly for the SaaS-Portal storefront apps.
    // If we land here, assume dashboard logic only.

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
    matcher: ['/((?!_next|static|public|favicon.ico|api|.*\\..*).*)']
};
