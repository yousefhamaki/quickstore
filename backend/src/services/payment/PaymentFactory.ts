import { IStore } from '../../models/Store';
import { IPaymentProvider } from './IPaymentProvider';
import { PaymobPaymentService } from './PaymobPaymentService';
import { KashierPaymentService } from './KashierPaymentService';
import { decrypt } from '../../utils/crypto';

export class PaymentFactory {
    static getProvider(store: IStore): IPaymentProvider {
        const providerConfig = store.settings?.payment as { provider?: string; credentials?: any } | undefined;

        if (!providerConfig || !providerConfig.provider) {
             throw new Error("No active payment provider configured for this store.");
        }

        // Decrypt credentials natively before passing to the concrete Strategy
        const encryptedKey = providerConfig.credentials?.apiKey || '';
        const decryptedApiKey = encryptedKey ? decrypt(encryptedKey) : '';

        const encryptedSecret = providerConfig.credentials?.apiSecret || '';
        const decryptedApiSecret = encryptedSecret ? decrypt(encryptedSecret) : '';

        const publicKey = providerConfig.credentials?.publicKey || '';
        const iframeId = providerConfig.credentials?.iframeId || '';
        // Plain account identifier, not a secret — never passed to decrypt().
        const merchantId = providerConfig.credentials?.merchantId || '';

        switch (providerConfig.provider) {
            case 'paymob':
                return new PaymobPaymentService(decryptedApiKey, decryptedApiSecret, publicKey, iframeId);
            case 'kashier':
                // Kashier's Payment API Key doubles as both the HMAC secret
                // and the api-key header — reuses the shared, already-
                // encrypted `apiKey` credential field (see
                // KashierPaymentService.ts's doc-comment).
                return new KashierPaymentService(merchantId, decryptedApiKey);
            case 'stripe':
            case 'paypal':
            case 'fawry':
                // These only exist today as unfinished skeletons: fake
                // checkout URLs and a validateWebhookPayload() that accepts
                // ANY signature — see services/payment/*PaymentService.ts
                // and constants/paymentProviders.ts. The Store schema and
                // storeController already refuse to save these as a store's
                // provider, but a record could still hold one from before
                // that restriction (or a direct DB write) — refuse here too
                // rather than ever construct a service that would silently
                // "accept" a forged webhook or hand a customer a dead
                // checkout link.
                throw new Error(`Payment provider '${providerConfig.provider}' is not yet available (unfinished integration). Use 'paymob', 'kashier' or 'manual'.`);
            case 'manual':
            default:
                throw new Error(`Payment strategy '${providerConfig.provider}' does not require abstract programmatic initialization.`);
        }
    }
}
