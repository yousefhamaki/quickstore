/**
 * Payment providers a store can actually be configured to use right now.
 *
 * Stripe/PayPal/Fawry only exist today as unfinished skeletons
 * (services/payment/{Stripe,PayPal,Fawry}PaymentService.ts): their
 * `initializePayment` returns a hardcoded placeholder checkout URL and their
 * `validateWebhookPayload` accepts ANY signature as long as a secret string
 * is configured — i.e. a forgeable webhook. Until each is given a real SDK
 * integration and real signature verification, they must stay unreachable:
 * see models/Store.ts (schema enum), controllers/storeController.ts
 * (rejects saving them), and services/payment/PaymentFactory.ts (refuses to
 * construct them even if a record somehow already holds one).
 */
export const IMPLEMENTED_PAYMENT_PROVIDERS = ['manual', 'paymob'] as const;
export type ImplementedPaymentProvider = typeof IMPLEMENTED_PAYMENT_PROVIDERS[number];
