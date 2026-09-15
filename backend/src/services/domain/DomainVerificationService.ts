import crypto from 'crypto';
import dns from 'dns';

const resolveTxt = dns.promises.resolveTxt;

/**
 * Custom-domain ownership verification.
 *
 * A merchant can only claim `store.domain.customDomain` if they can prove
 * they control that domain's DNS — otherwise nothing would stop merchant A
 * from typing in a domain merchant B (or anyone else) actually owns (see
 * the uniqueness fix on Store.domain.customDomain for the other half of
 * that story: even a domain no one has verified yet can only be claimed by
 * ONE store at a time).
 *
 * The proof is a standard TXT-record challenge, the same mechanism used by
 * most SaaS platforms (Vercel, Netlify, etc.) for custom domains:
 *   1. We generate a random token and ask the merchant to publish it as a
 *      TXT record at `_buildora-verify.<their-domain>`.
 *   2. We look that record up ourselves via DNS — not by trusting anything
 *      the client sends — and only flip `isVerified` if it matches exactly.
 *
 * This does NOT check whether the domain's CNAME/A record actually points
 * at Buildora's infrastructure — that's a routing concern, not a security
 * one (if it's not pointed here, visitors simply never reach us with that
 * Host header, so there's nothing to protect against). See
 * docs/custom-domains.md for the full DNS + server setup a merchant and an
 * operator each need.
 */
export class DomainVerificationService {
    static readonly TXT_RECORD_PREFIX = '_buildora-verify';

    static generateVerificationToken(): string {
        return `buildora-verify-${crypto.randomBytes(16).toString('hex')}`;
    }

    static getChallengeHostname(customDomain: string): string {
        return `${this.TXT_RECORD_PREFIX}.${customDomain}`;
    }

    /**
     * Looks up the TXT record and checks it against the expected token.
     * Never throws — DNS lookup failures (NXDOMAIN, timeout, no records)
     * are reported as `{ verified: false, error }` so the controller can
     * show the merchant a clear reason instead of a 500.
     */
    static async verify(customDomain: string, expectedToken: string): Promise<{ verified: boolean; error?: string }> {
        const hostname = this.getChallengeHostname(customDomain);

        let records: string[][];
        try {
            records = await resolveTxt(hostname);
        } catch (err: any) {
            if (err?.code === 'ENODATA' || err?.code === 'ENOTFOUND') {
                return { verified: false, error: `No TXT record found at ${hostname} yet. DNS changes can take a few minutes to propagate.` };
            }
            return { verified: false, error: `DNS lookup failed: ${err?.message || 'unknown error'}` };
        }

        // Each TXT record can be split into multiple strings by the
        // resolver; join them back together the way DNS clients normally do.
        const found = records.map((chunks) => chunks.join(''));
        const matched = found.some((value) => value.trim() === expectedToken);

        if (!matched) {
            return { verified: false, error: `Found a TXT record at ${hostname}, but it doesn't match the expected verification token.` };
        }

        return { verified: true };
    }
}
