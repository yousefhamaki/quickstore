/**
 * Shared `domain` option for every place that sets or removes the 'token'
 * cookie (AuthContext, the axios 401 interceptor, the /auth/clear pages).
 *
 * A token cookie set with no `domain` is scoped to the exact host that
 * issued it and won't be sent on requests to a *different* subdomain —
 * e.g. logging in on quickstore.live wouldn't carry over to some other
 * subdomain of it. Setting NEXT_PUBLIC_COOKIE_DOMAIN to the shared parent
 * (e.g. ".quickstore.live") makes the cookie valid across every subdomain
 * instead. Left unset (the default), this returns `{}` — exactly today's
 * host-only behavior, unaffected until this is deliberately configured.
 * Removal must use the SAME domain the cookie was set with, or it
 * silently fails to delete it.
 */
export const authCookieOptions = (): { domain?: string } => {
    const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
    return domain ? { domain } : {};
};
