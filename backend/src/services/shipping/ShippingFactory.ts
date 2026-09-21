import { IStore } from '../../models/Store';
import { IShippingProvider } from './IShippingProvider';
import { BostaShippingService } from './BostaShippingService';
import { AramexShippingService } from './AramexShippingService';
import { MylerzShippingService } from './MylerzShippingService';
import { JTExpressShippingService } from './JTExpressShippingService';
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

        // Dynamically decrypt stored database AES credentials for every
        // SECRET field (see constants/shippingProviders.ts's
        // SHIPPING_SECRET_CREDENTIAL_FIELDS) — non-secret account
        // identifiers are passed through as plain values.
        const credentials = {
            apiKey: settings.credentials.apiKey ? decrypt(settings.credentials.apiKey) : undefined,
            apiSecret: settings.credentials.apiSecret ? decrypt(settings.credentials.apiSecret) : undefined,
            accountNumber: settings.credentials.accountNumber,
            accountPin: settings.credentials.accountPin ? decrypt(settings.credentials.accountPin) : undefined,
            accountEntity: settings.credentials.accountEntity,
            accountCountryCode: settings.credentials.accountCountryCode,
            username: settings.credentials.username ? decrypt(settings.credentials.username) : undefined,
            password: settings.credentials.password ? decrypt(settings.credentials.password) : undefined,
            apiAccount: settings.credentials.apiAccount,
            customerCode: settings.credentials.customerCode,
            privateKey: settings.credentials.privateKey ? decrypt(settings.credentials.privateKey) : undefined
        };

        switch (settings.provider.toLowerCase()) {
            case 'bosta':
                if (!credentials.apiKey) throw new Error('Bosta API strict key authorization is missing.');
                return new BostaShippingService(credentials.apiKey);

            case 'aramex':
                if (!credentials.accountNumber || !credentials.accountPin || !credentials.accountEntity ||
                    !credentials.accountCountryCode || !credentials.username || !credentials.password) {
                    throw new Error('Aramex credentials are incomplete (accountNumber, accountPin, accountEntity, accountCountryCode, username and password are all required).');
                }
                return new AramexShippingService({
                    accountNumber: credentials.accountNumber,
                    accountPin: credentials.accountPin,
                    accountEntity: credentials.accountEntity,
                    accountCountryCode: credentials.accountCountryCode,
                    username: credentials.username,
                    password: credentials.password
                });

            case 'mylerz':
                if (!credentials.username || !credentials.password) {
                    throw new Error('Mylerz credentials are incomplete (username and password are required).');
                }
                return new MylerzShippingService({
                    username: credentials.username,
                    password: credentials.password
                });

            case 'jt_express':
                if (!credentials.apiAccount || !credentials.customerCode || !credentials.privateKey || !credentials.password) {
                    throw new Error('J&T Express credentials are incomplete (apiAccount, customerCode, privateKey and password are all required).');
                }
                return new JTExpressShippingService({
                    apiAccount: credentials.apiAccount,
                    customerCode: credentials.customerCode,
                    privateKey: credentials.privateKey,
                    password: credentials.password
                });

            default:
                throw new Error(`Shipping provider ${settings.provider} strategy is unrecognized or unimplemented.`);
        }
    }
}
