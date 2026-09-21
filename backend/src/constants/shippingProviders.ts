/**
 * Shipping providers a store can actually be configured to use right now.
 *
 * 'local' is manual/self-managed tracking (no API). 'bosta' is the original
 * live REST integration. 'aramex' (SOAP), 'mylerz' (REST) and 'jt_express'
 * (form-post + MD5 digest signing) are real courier integrations — see
 * services/shipping/{AramexShippingService,MylerzShippingService,JTExpressShippingService}.ts
 * and ShippingFactory.ts's switch statement, which must stay in sync with
 * this list (models/Store.ts's schema enum is generated FROM this constant,
 * so it never needs separate updates).
 */
export const IMPLEMENTED_SHIPPING_PROVIDERS = ['local', 'bosta', 'aramex', 'mylerz', 'jt_express'] as const;
export type ImplementedShippingProvider = typeof IMPLEMENTED_SHIPPING_PROVIDERS[number];

/**
 * Which fields under a store's settings.shipping.credentials are actual
 * secrets that must be AES-encrypted at rest (and passed through
 * applyEncryptedCredentialField's masked-placeholder / already-encrypted /
 * blank-clears / fresh-plaintext logic) rather than plain account
 * identifiers a merchant needs to see/edit as readable text.
 *
 * - apiKey / apiSecret: Bosta (apiSecret is reserved/legacy, unused by any
 *   provider today but kept encrypted since it's a credential-shaped field).
 * - accountPin, username, password: Aramex's AccountPin/UserName/Password,
 *   and Mylerz's username/password.
 * - privateKey: J&T Express's signing key.
 *
 * Deliberately NOT in this list (passed through as plain values by
 * storeController.ts): accountNumber, accountEntity, accountCountryCode
 * (Aramex), apiAccount, customerCode (J&T Express) — these are account
 * identifiers, not secrets, and decrypt() is never called on them.
 */
export const SHIPPING_SECRET_CREDENTIAL_FIELDS = ['apiKey', 'apiSecret', 'accountPin', 'username', 'password', 'privateKey'] as const;
export type ShippingSecretCredentialField = typeof SHIPPING_SECRET_CREDENTIAL_FIELDS[number];
