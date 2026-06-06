import { IOrder } from '../../models/Order';
import { IStore } from '../../models/Store';

export interface IPaymentProvider {
    /**
     * Initializes a payment intent/session with the external gateway.
     * @returns A redirect URL for the customer to complete payment, or the transaction object.
     */
    initializePayment(order: IOrder, store: IStore): Promise<{ paymentUrl: string; transactionId?: string }>;

    /**
     * Validates an incoming webhook payload using the provider's signature/HMAC verification patterns.
     */
    validateWebhookPayload(payload: any, signature: string): boolean;
}
