import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

// This middleware runs on every single request in production, not just
// dev — logging on each one is pure overhead once real traffic hits it
// (and clutters production logs). Gate all the debug traces below to dev.
const isDev = process.env.NODE_ENV === 'development';

/** Decode a JWT payload without crypto (edge-runtime safe). Returns null on any error. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return null;
        // atob is available in the Next.js edge runtime
        const json = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json) as Record<string, unknown>;
    } catch {
        return null;
    }
}

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const host = request.headers.get('host') || '';
    const hostname = host.split(':')[0]; // Normalize by removing port

    // ================================================================
    // 0. DOMAIN CLASSIFICATION — Identify main (landing) vs store domains
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
        'www.buildora.live',
        'buildaura.store',
        'www.buildaura.store'
    ];

    const isMainDomain = mainDomains.includes(hostname) || hostname.endsWith('.vercel.app');

    // ================================================================
    // 1. EARLY EXIT — Protect ALL static assets from being rewritten.
    //    This is the FIRST check and the most important.
    //    Without it, CSS/JS/fonts get rewritten to
    //    /en/store/hamaki/_next/static/... which causes 404s.
    // ================================================================
    const isManifestFile = pathname === '/manifest.json' || pathname === '/manifest.webmanifest';

    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/static') ||
        pathname.startsWith('/public') ||
        pathname.startsWith('/mobile-app') ||
        pathname === '/favicon.ico' ||
        (isManifestFile && isMainDomain) || // Only early-exit manifest on main domain
        (!isManifestFile && /\.(?:css|js|ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot|map)$/i.test(pathname))
    ) {
        return NextResponse.next();
    }

    const segments = pathname.split('/');
    const isLocaleInPath = ['en', 'ar'].includes(segments[1]);
    const pathAfterLocale = isLocaleInPath
        ? '/' + segments.slice(2).join('/')
        : pathname;

    // ================================================================
    // 2. AUTH GUARDS — merchant/dashboard/admin/auth/verify-email used to
    //    live in a separate merchant-dashboard app (a multi-zone setup)
    //    that had its OWN middleware enforcing these redirects. That app
    //    has been merged into this one; its auth-guard logic moves here
    //    verbatim so unauthenticated/unverified users are still redirected
    //    correctly now that these are just regular routes in this app's
    //    own src/app/[locale] tree.
    // ================================================================
    const token = request.cookies.get('token')?.value;
    const locale = isLocaleInPath ? segments[1] : 'en';

    const isMerchantPath = pathAfterLocale.startsWith('/merchant');
    const isDashboardPath = pathAfterLocale.startsWith('/dashboard');
    const isAdminPath = pathAfterLocale.startsWith('/admin');
    const isAuthPath = pathAfterLocale.startsWith('/auth');
    const isStorePath = pathAfterLocale.startsWith('/store');

    // Paths that verified AND unverified users can access freely
    const isVerificationPath =
        pathAfterLocale.startsWith('/auth/verification-required') ||
        pathAfterLocale.startsWith('/verify-email');

    // Redirect unauthenticated users to login.
    // CRITICAL: store paths must NEVER trigger this — a storefront visitor
    // isn't a merchant and has no token, and never should be redirected.
    if ((isMerchantPath || isDashboardPath || isAdminPath) && !isStorePath && !token) {
        return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
    }

    // Redirect authenticated users away from auth pages (but allow verification pages)
    if (token && isAuthPath && !isVerificationPath) {
        return NextResponse.redirect(new URL(`/${locale}/merchant`, request.url));
    }

    // Block unverified merchants from protected routes until they verify their email.
    if (token && (isMerchantPath || isDashboardPath) && !isStorePath && !isVerificationPath) {
        const payload = decodeJwtPayload(token);
        const isVerified = payload?.isVerified === true;

        if (!isVerified) {
            return NextResponse.redirect(
                new URL(`/${locale}/auth/verification-required`, request.url)
            );
        }
    }

    // ================================================================
    // 3. SUBDOMAIN ROUTING — Rewrite store requests
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
        } else if (hostname.endsWith('.localhost')) {
            // Local dev fallback (e.g. hamaki.localhost:3000) — must be
            // checked BEFORE the generic custom-domain branch below, since
            // "hamaki.localhost" also satisfies `hostname.includes('.')`
            // and would otherwise be misread as an unverified custom
            // domain (and 404 as "Store Not Found"), silently breaking
            // local subdomain testing for every subdomain-dependent page.
            const parts = hostname.split('.');
            subdomain = parts[0];
        } else if (hostname.includes('.') && !mainDomains.includes(hostname)) {
            // Custom domain mapped to the storefront
            subdomain = hostname;
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
                // Build the clean sub-path (everything after the locale, or the full path if no locale)
                const cleanPathname = isLocaleInPath
                    ? (segments.length > 2 ? '/' + segments.slice(2).join('/') : '')
                    : (pathname === '/' ? '' : pathname);

                // PROTOCOL-SAFE REWRITE using clone()
                const rewriteUrl = request.nextUrl.clone();
                rewriteUrl.pathname = `/${locale}/store/${subdomain}${cleanPathname}`;

                if (isDev) console.log(
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
    // 4. FALLBACK — i18n routing for main domain pages
    // ================================================================
    return handleI18nRouting(request);
}

export const config = {
    // Pre-filter at the framework level: exclude static resources so this
    // middleware only runs where it can actually do something (storefront
    // subdomain rewriting or locale routing).
    matcher: [
        '/((?!static|public|favicon\\.ico|api|.*\\.(?:css|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2|ttf|eot|map)).*)',
        '/manifest.json',
        '/manifest.webmanifest',
    ],
};
