import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ================================================================
    // 1. EARLY EXIT — Protect ALL static assets from being rewritten.
    //    This is the FIRST check and the most important.
    //    Without it, CSS/JS/fonts get rewritten to
    //    /en/store/hamaki/_next/static/... which causes 404s.
    // ================================================================
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/static') ||
        pathname.startsWith('/public') ||
        pathname === '/favicon.ico' ||
        pathname === '/manifest.webmanifest' ||
        // Catch ALL file extensions: css, js, fonts, images, maps, json
        /\.(?:css|js|ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot|map|json)$/i.test(pathname)
    ) {
        return NextResponse.next();
    }

    // ================================================================
    // 2. MERCHANT DASHBOARD ROUTING (Multi-Zone Rewrite)
    //    Route dashboard/merchant/admin/auth/verify-email paths to the Merchant App.
    // ================================================================
    const segments = pathname.split('/');
    const isLocaleInPath = ['en', 'ar'].includes(segments[1]);
    const pathAfterLocale = isLocaleInPath
        ? '/' + segments.slice(2).join('/')
        : pathname;

    const routes = ['/merchant', '/dashboard', '/admin', '/auth', '/verify-email'];
    const isMerchantRoute = routes.some(
        (p) => pathAfterLocale.startsWith(p)
    );

    if (isMerchantRoute) {
        // Strip trailing slash to prevent Next.js trailing slash redirect loops
        let cleanPath = pathname;
        if (cleanPath.endsWith('/') && cleanPath !== '/') {
            cleanPath = cleanPath.slice(0, -1);
        }

        // Always ensure locale prefix is present for the target to avoid next-intl redirects on the Merchant App
        const locale = isLocaleInPath ? segments[1] : 'en';
        const targetPath = isLocaleInPath ? cleanPath : `/en${cleanPath}`;

        let merchantDashboardUrl = process.env.MERCHANT_DASHBOARD_URL || 'http://localhost:3001';
        if (!merchantDashboardUrl.startsWith('http://') && !merchantDashboardUrl.startsWith('https://')) {
            merchantDashboardUrl = `https://${merchantDashboardUrl}`;
        }
        merchantDashboardUrl = merchantDashboardUrl.replace(/\/+$/, '');

        const rewriteUrl = new URL(targetPath, merchantDashboardUrl);
        rewriteUrl.search = request.nextUrl.search;

        console.log(`[Merchant Multi-Zone Rewrite] "${pathname}" -> "${rewriteUrl.toString()}"`);

        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-locale', locale);
        requestHeaders.set('x-next-intl-locale', locale);

        return NextResponse.rewrite(rewriteUrl, {
            request: {
                headers: requestHeaders,
            }
        });
    }

    const host = request.headers.get('host') || '';
    const hostname = host.split(':')[0]; // Normalize by removing port

    // ================================================================
    // 3. DOMAIN CLASSIFICATION — Identify main (landing) vs store domains
    // ================================================================
    const mainDomains = [
        'localhost',
        '127.0.0.1',
        '[::1]',
        'quickstore.com',
        'quickstore.live',
        'quickstore.test',
        'www.quickstore.com',
        'www.quickstore.live',
        'www.quickstore.test',
        'api.quickstore.com',
        'buildora.live',
        'www.buildora.live'
    ];

    const isMainDomain = mainDomains.includes(hostname) || hostname.endsWith('.vercel.app');

    // ================================================================
    // 4. SUBDOMAIN ROUTING — Rewrite store requests
    //    e.g. hamaki.quickstore.test:3000/products/abc
    //      -> /en/store/hamaki/products/abc
    // ================================================================
    if (!isMainDomain) {
        // --- Extract subdomain ---
        let subdomain = '';
        if (
            hostname.endsWith('.quickstore.live') ||
            hostname.endsWith('.quickstore.com') ||
            hostname.endsWith('.quickstore.test') ||
            hostname.endsWith('.buildora.live')
        ) {
            subdomain = hostname.split('.')[0];
        } else if (hostname.includes('.') && !mainDomains.includes(hostname)) {
            // Custom domain mapped to the storefront
            subdomain = hostname;
        } else {
            // Local dev fallback (e.g. hamaki.localhost:3000)
            const parts = hostname.split('.');
            if (parts.length > 1) {
                subdomain = parts[0];
            }
        }

        if (subdomain && subdomain !== 'www') {
            const isAlreadyStorePath = isLocaleInPath
                ? segments[2] === 'store'
                : segments[1] === 'store';

            const isSystemPath = ['/auth', '/merchant', '/dashboard', '/admin', '/api', '/_next'].some(
                (p) => pathAfterLocale.startsWith(p)
            );

            // Only rewrite if NOT already a store path and NOT a system path
            if (!isAlreadyStorePath && !isSystemPath) {
                const locale = isLocaleInPath ? segments[1] : 'en';

                // Build the clean sub-path (everything after the locale, or the full path if no locale)
                const cleanPathname = isLocaleInPath
                    ? (segments.length > 2 ? '/' + segments.slice(2).join('/') : '')
                    : (pathname === '/' ? '' : pathname);

                // PROTOCOL-SAFE REWRITE using clone()
                const rewriteUrl = request.nextUrl.clone();
                rewriteUrl.pathname = `/${locale}/store/${subdomain}${cleanPathname}`;

                console.log(
                    `[Storefront Rewrite] "${pathname}" -> "${rewriteUrl.pathname}"`
                );

                const requestHeaders = new Headers(request.headers);
                requestHeaders.set('x-locale', locale);
                requestHeaders.set('x-next-intl-locale', locale);

                return NextResponse.rewrite(rewriteUrl, {
                    request: {
                        headers: requestHeaders,
                    }
                });
            }
        }
    }

    // ================================================================
    // 5. FALLBACK — i18n routing for main domain pages
    // ================================================================
    return handleI18nRouting(request);
}

export const config = {
    // Pre-filter at the framework level: exclude static resources.
    matcher: [
        '/((?!_next|static|public|favicon\\.ico|api|.*\\.(?:css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|map|json)).*)',
    ],
};
