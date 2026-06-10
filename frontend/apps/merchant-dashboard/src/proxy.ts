import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const handleI18nRouting = createMiddleware(routing);

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

    // Skip middleware for Next.js internals, API routes, and static files
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot)$/)
    ) {
        return NextResponse.next();
    }

    const token = request.cookies.get('token')?.value;

    // Extract locale from pathname
    const pathnameLocale = pathname.split('/')[1];
    const isLocaleInPath = ['en', 'ar'].includes(pathnameLocale);
    const locale = isLocaleInPath ? pathnameLocale : 'en';

    // Auth redirects - check paths without locale prefix
    const pathWithoutLocale = isLocaleInPath ? (pathname.substring(3) || '/') : pathname;

    const isMerchantPath = pathWithoutLocale.startsWith('/merchant');
    const isDashboardPath = pathWithoutLocale.startsWith('/dashboard');
    const isAdminPath = pathWithoutLocale.startsWith('/admin');
    const isAuthPath = pathWithoutLocale.startsWith('/auth');
    const isStorePath = pathWithoutLocale.startsWith('/store');

    // Paths that verified AND unverified users can access freely
    const isVerificationPath =
        pathWithoutLocale.startsWith('/auth/verification-required') ||
        pathWithoutLocale.startsWith('/verify-email');

    // Redirect unauthenticated users to login
    // CRITICAL: Ensure store paths NEVER trigger this
    if ((isMerchantPath || isDashboardPath || isAdminPath) && !isStorePath && !token) {
        return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url));
    }

    // Redirect authenticated users away from auth pages (but allow verification pages)
    if (token && isAuthPath && !isVerificationPath) {
        return NextResponse.redirect(new URL(`/${locale}/merchant`, request.url));
    }

    // ── Verification Guard ─────────────────────────────────────────────────────
    // If a token exists, decode it and block unverified merchants from accessing
    // protected routes. They must verify their email first.
    if (token && (isMerchantPath || isDashboardPath) && !isStorePath && !isVerificationPath) {
        const payload = decodeJwtPayload(token);
        const isVerified = payload?.isVerified === true;

        if (!isVerified) {
            return NextResponse.redirect(
                new URL(`/${locale}/auth/verification-required`, request.url)
            );
        }
    }
    // ──────────────────────────────────────────────────────────────────────────

    // Handle i18n routing
    return handleI18nRouting(request);
}

export const config = {
    matcher: ['/((?!_next|static|public|favicon.ico|api|.*\\..*).*)'
    ]
};
