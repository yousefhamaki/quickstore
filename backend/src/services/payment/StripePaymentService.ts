import { IPaymentProvider } from './IPaymentProvider';
import { IOrder } from '../../models/Order';
import { IStore } from '../../models/Store';

/**
 * UNFINISHED — not reachable in production.
 *
 * `initializePayment` returns a hardcoded placeholder URL instead of a real
 * Stripe Checkout Session, and `validateWebhookPayload` accepts ANY
 * signature as long as a webhook secret string is configured — a forgeable
 * webhook that would let anyone mark an order "paid" without paying.
 * `PaymentFactory` refuses to construct this class (see PaymentFactory.ts),
 * and the Store schema/storeController refuse to let a store select
 * 'stripe' as its provider (see constants/paymentProviders.ts) — do not
 * remove those guards without first implementing the real Stripe SDK calls
 * (checkout session creation) and `stripe.webhooks.constructEvent` here.
 */
export class StripePaymentService implements IPaymentProvider {
    private secretKey: string;
    private webhookSecret: string;
    
    constructor(secretKey: string, webhookSecret: string) {
        this.secretKey = secretKey;
        this.webhookSecret = webhookSecret;
    }

    async initializePayment(order: IOrder, store: IStore): Promise<{ paymentUrl: string; transactionId: string }> {
        // Stripe Skeleton implementation: Generates checkout session URL using the Node SDK
        return {
            paymentUrl: `https://checkout.stripe.com/c/pay/cs_test_placeholder`,
            transactionId: `cs_test_placeholder_${order._id}`
        };
    }

    validateWebhookPayload(payload: any, signature: string): boolean {
        // Skeleton: Uses stripe.webhooks.constructEvent internally
        if (!this.webhookSecret) return false;
        return true; 
    }
}
