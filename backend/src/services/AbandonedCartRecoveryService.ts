import crypto from 'crypto';
import AbandonedCart from '../models/AbandonedCart';
import Store from '../models/Store';
import { sendAbandonedCartRecoveryEmail } from './emailService';

/**
 * Recovery sweep for storefront carts captured by
 * controllers/abandonedCartController.ts's captureAbandonedCart (see
 * checkout/page.tsx for where those captures come from). Not the merchant
 * onboarding/activation drip (MerchantDripService) — this is store-to-
 * shopper, that one is Buildora-to-merchant.
 *
 * A cart only gets emailed once it's been sitting `pending` for at least
 * ABANDONED_CART_MIN_AGE_MS (long enough that it's a genuine abandonment,
 * not just a shopper still filling out the form) and at most
 * ABANDONED_CART_MAX_AGE_MS old (no point nudging about a week-old cart —
 * prices/stock may have moved on). `recoveryEmailSentAt` is set immediately
 * after a successful send so a cart is never emailed twice, even across
 * overlapping sweep runs.
 */

// Named constants, easy to tune — see queues/abandonedCartQueue.ts for how
// often the sweep itself runs (independent of these age thresholds).
export const ABANDONED_CART_MIN_AGE_MS = 60 * 60 * 1000; // 1 hour
export const ABANDONED_CART_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AbandonedCartSweepSummary {
    sent: number;
    skipped: number;
    failed: number;
}

export const runAbandonedCartRecoverySweep = async (): Promise<AbandonedCartSweepSummary> => {
    const summary: AbandonedCartSweepSummary = { sent: 0, skipped: 0, failed: 0 };
    const now = Date.now();
    const oldEnoughCutoff = new Date(now - ABANDONED_CART_MIN_AGE_MS);
    const notTooOldCutoff = new Date(now - ABANDONED_CART_MAX_AGE_MS);

    const candidates = await AbandonedCart.find({
        status: 'pending',
        recoveryEmailSentAt: { $exists: false },
        createdAt: { $lte: oldEnoughCutoff, $gte: notTooOldCutoff },
    });

    for (const cart of candidates) {
        try {
            const store = await Store.findById(cart.storeId).select('name settings domain');
            if (!store) {
                summary.skipped++;
                continue;
            }

            // Backfills a token for any pre-existing cart that predates this
            // field (shouldn't normally happen since capture always sets
            // one, but keeps the sweep robust either way).
            if (!cart.recoveryToken) {
                cart.recoveryToken = crypto.randomBytes(24).toString('hex');
            }

            const storeDomainBase = process.env.STORE_DOMAIN_BASE || 'quickstore.live';
            const storeHost = (store.domain?.customDomain && store.domain?.isVerified)
                ? store.domain.customDomain
                : `${store.domain.subdomain}.${storeDomainBase}`;
            const protocol = storeHost.includes('localhost') ? 'http' : 'https';
            const recoveryUrl = `${protocol}://${storeHost}/checkout?recover=${cart.recoveryToken}`;

            await sendAbandonedCartRecoveryEmail(
                store,
                cart.customerEmail,
                recoveryUrl,
                cart.items as any,
                cart.totalAmount,
                store.settings?.currency || 'EGP'
            );

            cart.recoveryEmailSentAt = new Date();
            await cart.save();
            summary.sent++;
        } catch (err) {
            console.error(`[AbandonedCartRecoveryService] Failed to send recovery email for cart ${cart._id}:`, err);
            summary.failed++;
        }
    }

    console.log('[AbandonedCartRecoveryService] Sweep complete:', summary);
    return summary;
};
