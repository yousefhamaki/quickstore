import { IPaymentProvider } from './IPaymentProvider';
import { IOrder } from '../../models/Order';
import { IStore } from '../../models/Store';
import axios from 'axios';
import crypto from 'crypto';

export class PaymobPaymentService implements IPaymentProvider {
    private apiKey: string;
    private hmacSecret: string;
    private integrationId: string; // Passed via publicKey field in generic schema
    private iframeId: string; 
    private apiUrl = 'https://accept.paymob.com/api';

    constructor(apiKey: string, hmacSecret: string, integrationId: string, iframeId: string) {
        this.apiKey = apiKey;
        this.hmacSecret = hmacSecret;
        this.integrationId = integrationId;
        this.iframeId = iframeId;
    }

    async initializePayment(order: IOrder, store: IStore): Promise<{ paymentUrl: string; transactionId: string }> {
        try {
            // 1. Authentication Request
            const authRes = await axios.post(`${this.apiUrl}/auth/tokens`, {
                api_key: this.apiKey,
            });
            const token = authRes.data.token;

            // 2. Order Registration
            const orderRes = await axios.post(`${this.apiUrl}/ecommerce/orders`, {
                auth_token: token,
                delivery_needed: "false",
                amount_cents: Math.round(order.total * 100).toString(),
                currency: "EGP",
                merchant_order_id: order.orderNumber,
                items: order.items.map(item => ({
                    name: item.name,
                    amount_cents: Math.round(item.price * 100).toString(),
                    description: item.variant || "Standard",
                    quantity: item.quantity.toString()
                }))
            });
            const paymobOrderId = orderRes.data.id;

            // 3. Payment Key Generation
            const paymentKeyRes = await axios.post(`${this.apiUrl}/acceptance/payment_keys`, {
                auth_token: token,
                amount_cents: Math.round(order.total * 100).toString(),
                expiration: 3600,
                order_id: paymobOrderId,
                billing_data: {
                    apartment: "NA",
                    email: order.billingAddress.fullName.replace(" ", "") + "@quickstore.local",
                    floor: "NA",
                    first_name: order.billingAddress.fullName.split(' ')[0] || "Customer",
                    street: order.billingAddress.address || "Street",
                    building: "NA",
                    phone_number: order.billingAddress.phone || "+201000000000",
                    shipping_method: "NA",
                    postal_code: order.billingAddress.postalCode || "00000",
                    city: order.billingAddress.city || "City",
                    country: "EG",
                    last_name: order.billingAddress.fullName.split(' ')[1] || "Name",
                    state: order.billingAddress.state || "State"
                },
                currency: "EGP",
                integration_id: parseInt(this.integrationId, 10)
            });

            const paymentToken = paymentKeyRes.data.token;

            // Optional custom iframe routing, fallback to direct integration iframe
            const finalIframeId = this.iframeId || process.env.PAYMOB_IFRAME_ID || '000000';

            return {
                paymentUrl: `https://accept.paymob.com/api/acceptance/iframes/${finalIframeId}?payment_token=${paymentToken}`,
                transactionId: paymobOrderId.toString()
            };
        } catch (error: any) {
            console.error('Paymob Initialization Fault:', error.response?.data || error.message);
            throw new Error(`Paymob upstream error: ${error.message}`);
        }
    }

    validateWebhookPayload(payload: any, signature: string): boolean {
        if (!this.hmacSecret) return false;

        const { obj } = payload;
        if (!obj) return false;

        // Paymob HMAC concatenation order
        const hmacString = [
            obj.amount_cents,
            obj.created_at,
            obj.currency,
            obj.error_occured,
            obj.has_parent_transaction,
            obj.id,
            obj.integration_id,
            obj.is_3d_secure,
            obj.is_auth,
            obj.is_capture,
            obj.is_refunded,
            obj.is_standalone_payment,
            obj.is_voided,
            obj.order?.id,
            obj.owner,
            obj.pending,
            obj.source_data?.pan,
            obj.source_data?.sub_type,
            obj.source_data?.type,
            obj.success
        ].join('');

        const hash = crypto.createHmac('sha512', this.hmacSecret).update(hmacString).digest('hex');
        return hash === signature;
    }
}
