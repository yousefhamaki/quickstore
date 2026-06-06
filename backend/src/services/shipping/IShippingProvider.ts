import { IOrder } from '../../models/Order';
import { IStore } from '../../models/Store';

export interface IShippingProvider {
    /**
     * Pushes a new shipment requirement to the 3rd-party provider REST API.
     */
    createShipment(order: IOrder, store: IStore): Promise<{ trackingNumber: string; waybillUrl: string }>;

    /**
     * Queries the provider for the most recent tracking state of a shipment.
     */
    trackShipment(trackingNumber: string): Promise<{ status: string; statusDate: Date }>;

    /**
     * Cancels an unfulfilled shipment request upstream.
     */
    cancelShipment(trackingNumber: string): Promise<boolean>;

    /**
     * Securely validates incoming Webhooks (e.g. SHA-256 HMAC verifications against the payload JSON)
     */
    validateWebhookPayload(payload: any, signature: string): boolean;
}
