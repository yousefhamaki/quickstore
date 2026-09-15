import jwt from 'jsonwebtoken';

/**
 * Signed token used solely by the unsubscribe link in the footer of every
 * merchant-activation drip email (see services/marketing/MerchantDripService.ts
 * and controllers/marketingDripController.ts). Reuses JWT_SECRET (already
 * provisioned — see .env.example) rather than introducing a new secret.
 *
 * Deliberately its own payload shape (a `purpose` marker, no `sid`/`role`/
 * `authProvider`) so it can never be confused with — or accepted by — the
 * normal login JWT flow (utils/auth.ts's generateToken / middleware/
 * authMiddleware.ts's protect), even though both happen to be signed with
 * the same secret. It is only ever verified here, by
 * verifyMarketingUnsubscribeToken, never by `protect`.
 */
const MARKETING_UNSUBSCRIBE_PURPOSE = 'marketing_unsubscribe';

interface MarketingUnsubscribeTokenPayload {
    uid: string;
    purpose: typeof MARKETING_UNSUBSCRIBE_PURPOSE;
}

export const generateMarketingUnsubscribeToken = (userId: string): string => {
    const payload: MarketingUnsubscribeTokenPayload = { uid: userId, purpose: MARKETING_UNSUBSCRIBE_PURPOSE };
    // No expiry: an unsubscribe link should keep working no matter how old
    // the email in someone's inbox is — unlike auth/session tokens, there's
    // no security reason to time-box a one-way "stop emailing me" action.
    return jwt.sign(payload, process.env.JWT_SECRET as string);
};

/**
 * Returns the userId encoded in a marketing-unsubscribe token, or null if
 * the token is missing, malformed, expired, forged, or wasn't actually
 * issued for this purpose.
 */
export const verifyMarketingUnsubscribeToken = (token: string): string | null => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as Partial<MarketingUnsubscribeTokenPayload>;
        if (decoded?.purpose !== MARKETING_UNSUBSCRIBE_PURPOSE || !decoded.uid) {
            return null;
        }
        return decoded.uid;
    } catch {
        return null;
    }
};
