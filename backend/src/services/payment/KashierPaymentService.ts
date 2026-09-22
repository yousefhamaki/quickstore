import { IPaymentProvider } from './IPaymentProvider';
import { IOrder } from '../../models/Order';
import { IStore } from '../../models/Store';
import crypto from 'crypto';

/**
 * Kashier — a real, live Egyptian payment gateway (Hosted Payment Page).
 * Egyptian merchants can actually receive/withdraw EGP payouts through it,
 * unlike Stripe/PayPal for this merchant base (see
 * constants/paymentProviders.ts's doc-comment).
 *
 * Credentials come straight from the merchant's own Kashier dashboard:
 *  - merchantId: e.g. "MID-91-106" (plain account identifier, not a secret).
 *  - apiKey: the merchant's Payment API Key — used BOTH as the HMAC-SHA256
 *    secret below and as the `api-key` header for any server-side Kashier
 *    API call. Reuses the shared `credentials.apiKey` field already wired
 *    through PaymentFactory/storeController's encryption path for Paymob.
 *
 * Checkout flow: redirect the customer to Kashier's Hosted Payment Page
 * (https://iframe.kashier.io/payment) with an order hash Kashier
 * independently recomputes to verify the request wasn't tampered with.
 *
 * Order-hash algorithm (HMAC-SHA256), per https://developers.kashier.io/:
 *   path = `/?payment=${merchantId}.${orderId}.${amount}.${currency}`
 *   hash = HMAC_SHA256(path, apiKey) as lowercase hex
 * Verified against Kashier's own published test vector before this file was
 * written: path '/?payment=mid-0-1.99.20.EGP' with secret '11111' produces
 * hash '606a8a1307d64caf4e2e9bb724738f115a8972c27eccb2a8acd9194c357e4bec'.
 */
export class KashierPaymentService implements IPaymentProvider {
    private merchantId: string;
    private apiKey: string;
    private hppBaseUrl = 'https://iframe.kashier.io/payment';

    constructor(merchantId: string, apiKey: string) {
        this.merchantId = merchantId;
        this.apiKey = apiKey;
    }

    async initializePayment(order: IOrder, store: IStore): Promise<{ paymentUrl: string; transactionId: string }> {
        if (!this.merchantId || !this.apiKey) {
            throw new Error('Kashier is not configured for this store (missing merchantId/apiKey).');
        }

        // Kashier's own dashboard charges in EGP for this merchant base —
        // mirrors PaymobPaymentService, which also hardcodes "EGP" rather
        // than trusting store.settings.currency.
        const currency = 'EGP';
        const orderId = order.orderNumber;
        const amount = order.total.toFixed(2);

        const path = `/?payment=${this.merchantId}.${orderId}.${amount}.${currency}`;
        const hash = crypto.createHmac('sha256', this.apiKey).update(path).digest('hex');

        // Where Kashier redirects the shopper's browser after they finish on
        // the Hosted Payment Page. Owned by us (this backend), not the
        // storefront directly, so the redirect signature can be verified
        // server-side before the order is ever marked paid — see
        // controllers/webhookController.ts's handleKashierCallback, mounted
        // publicly (no merchant JWT) at this exact path in routes/publicRoutes.ts,
        // same getBackendBaseUrl() pattern services/emailService.ts already
        // uses for building externally-reachable links.
        const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
        const merchantRedirect = `${backendUrl}/api/public/payments/kashier/callback/${store._id}`;

        const params = new URLSearchParams({
            mid: this.merchantId,
            orderId,
            amount,
            currency,
            hash,
            merchantRedirect
        });

        return {
            paymentUrl: `${this.hppBaseUrl}?${params.toString()}`,
            transactionId: orderId
        };
    }

    /**
     * Verifies Kashier's Hosted Payment Page redirect callback signature.
     *
     * `payload` is expected to be the full redirect query string object
     * (paymentStatus, merchantOrderId, orderId, orderReference,
     * transactionId, amount, currency, mode, signature, ...) and `signature`
     * the query's own `signature` value.
     *
     * Algorithm mirrors Kashier's own official reference implementation
     * (Kashier-payments/Php-Checkout-Demo, hppCallback.php): HMAC-SHA256
     * over every query param EXCEPT `signature` and `mode`, joined as
     * `key=value&key=value...` in the exact order Kashier appended them to
     * the URL (NOT alphabetically sorted), signed with the merchant's
     * Payment API key. I could not find a numbered/published test vector
     * for this specific callback signature the way the order hash above has
     * one — this is verified against Kashier's own published source code,
     * not an independently-confirmed input/output pair.
     */
    validateWebhookPayload(payload: Record<string, any>, signature: string): boolean {
        if (!this.apiKey || !signature || !payload) return false;

        const baseString = buildKashierRedirectBaseString(payload);
        const computed = crypto.createHmac('sha256', this.apiKey).update(baseString).digest('hex');
        return computed === signature;
    }
}

/**
 * Reconstructs the exact string Kashier signs for a Hosted Payment Page
 * redirect: every query param except `signature`/`mode`, in the order they
 * were present on the URL (insertion order — Node's query-string parsing,
 * like PHP's $_GET, preserves the order params appeared in the raw query
 * string), joined as `key=value&key=value`.
 */
export function buildKashierRedirectBaseString(query: Record<string, any>): string {
    const parts: string[] = [];
    for (const key of Object.keys(query)) {
        if (key === 'signature' || key === 'mode') continue;
        parts.push(`${key}=${query[key]}`);
    }
    return parts.join('&');
}
