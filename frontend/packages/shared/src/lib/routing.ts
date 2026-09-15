/**
 * Detects whether the current request is for a merchant's public storefront
 * (app/[locale]/store/[subdomain]/**) rather than the SaaS portal itself
 * (dashboard, merchant settings, admin, marketing pages, auth, etc).
 *
 * Storefront requests reach this route two ways, both of which must count:
 *  1. A path that already contains "/store/" — true for local/dev testing
 *     and for the resolved pathname Next.js's router sees after middleware
 *     rewrites a subdomain/custom-domain request to /store/[subdomain]
 *     (that rewrite happens before the App Router resolves any layout, so
 *     usePathname() reliably reflects it even during SSR).
 *  2. As a client-only fallback, a real merchant subdomain/custom-domain
 *     host (e.g. hamaki.quickstore.live, or a merchant's own domain) — a
 *     multi-level hostname that isn't the bare "www" host.
 *
 * Used by WalletContext (to skip billing polling on storefront pages) and
 * by the root layout's MerchantChrome gate (to skip mounting merchant-only
 * providers/widgets there entirely) — kept as one shared definition so the
 * two call sites can't drift out of sync with each other.
 */
export function isStorefrontPath(pathname?: string | null, hostname?: string): boolean {
    if (pathname?.includes('/store/')) return true;

    if (hostname) {
        const isMultiLevelSubdomain = hostname.split('.').length > 2;
        if (isMultiLevelSubdomain && !hostname.startsWith('www.')) return true;
    }

    return false;
}
