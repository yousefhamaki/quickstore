import { IStore } from '../../models/Store';
import { IShippingProvider } from './IShippingProvider';
import { BostaShippingService } from './BostaShippingService';
import { decrypt } from '../../utils/crypto';

export class ShippingFactory {
    /**
     * Constructs and authenticates pulling decrypted credentials securely from the Store.
     * Guaranteed to return a correctly instantiated IShippingProvider strategy map.
     */
    static getProvider(store: IStore): IShippingProvider {
        const settings = store.settings?.shipping;
        if (!settings || !settings.provider || !settings.credentials) {
            throw new Error('A Shipping provider is not explicitly configured for this store.');
        }

        // Dynamically Decrypt stored database AES credentials
        const credentials = {
            apiKey: settings.credentials.apiKey ? decrypt(settings.credentials.apiKey) : undefined,
            apiSecret: settings.credentials.apiSecret ? decrypt(settings.credentials.apiSecret) : undefined,
            accountNumber: settings.credentials.accountNumber
        };

        switch (settings.provider.toLowerCase()) {
            case 'bosta':
                if (!credentials.apiKey) throw new Error('Bosta API strict key authorization is missing.');
                return new BostaShippingService(credentials.apiKey);
                
            // case 'aramex':
            //    return new AramexShippingService(credentials.accountNumber, credentials.apiSecret);
                
            default:
                throw new Error(`Shipping provider ${settings.provider} strategy is unrecognized or unimplemented.`);
        }
    }
}
