import { IStore } from '../../models/Store';
import { IPaymentProvider } from './IPaymentProvider';
import { PaymobPaymentService } from './PaymobPaymentService';
import { StripePaymentService } from './StripePaymentService';
import { PayPalPaymentService } from './PayPalPaymentService';
import { FawryPaymentService } from './FawryPaymentService';
import { decrypt } from '../../utils/crypto';

export class PaymentFactory {
    static getProvider(store: IStore): IPaymentProvider {
        const providerConfig = store.settings?.payment;

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

        switch (providerConfig.provider) {
            case 'paymob':
                return new PaymobPaymentService(decryptedApiKey, decryptedApiSecret, publicKey, iframeId);
            case 'stripe':
                return new StripePaymentService(decryptedApiKey, decryptedApiSecret);
            case 'paypal':
                return new PayPalPaymentService(decryptedApiKey, decryptedApiSecret);
            case 'fawry':
                return new FawryPaymentService(publicKey, decryptedApiSecret);
            case 'manual':
            default:
                throw new Error(`Payment strategy '${providerConfig.provider}' does not require abstract programmatic initialization.`);
        }
    }
}
