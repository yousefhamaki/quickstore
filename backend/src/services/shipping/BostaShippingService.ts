import { IShippingProvider } from './IShippingProvider';
import { IOrder } from '../../models/Order';
import { IStore } from '../../models/Store';
import axios from 'axios';
import crypto from 'crypto';

export class BostaShippingService implements IShippingProvider {
    private apiKey: string;
    // Bosta API v0/v2 endpoint sandbox/production handling is assumed environment-based
    private baseUrl: string = 'https://app.bosta.co/api/v0';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private get headers() {
        return {
            'Authorization': this.apiKey, // Bosta exclusively requires the api key as the 'Authorization' header
            'Content-Type': 'application/json'
        };
    }

    async createShipment(order: IOrder, store: IStore): Promise<{ trackingNumber: string; waybillUrl: string }> {
        const payload = {
            specs: {
                packageDetails: { itemsCount: order.items.reduce((acc, i) => acc + i.quantity, 0) }
            },
            receiver: {
                firstName: order.shippingAddress.fullName.split(' ')[0] || 'Customer',
                lastName: order.shippingAddress.fullName.split(' ').slice(1).join(' ') || '.',
                phone: order.shippingAddress.phone,
                city: order.shippingAddress.city || 'Cairo',
                firstLine: order.shippingAddress.address || 'Standard Address'
            },
            pickupAddress: {
                city: "Cairo",
                firstLine: store.contact.address || "Store Main Address"
            },
            returnAddress: {
                city: "Cairo",
                firstLine: store.contact.address || "Store Main Address"
            },
            cod: order.paymentMethod === 'cod' ? order.total : 0,
            businessReference: order.orderNumber,
        };

        try {
            const response = await axios.post(`${this.baseUrl}/deliveries`, payload, { headers: this.headers });
            const deliveryId = response.data._id;
            const trackingNumber = response.data.trackingNumber;

            // Bosta automatically provisions waybill endpoints using the generated internal delivery ID
            const waybillUrl = `${this.baseUrl}/deliveries/awb/${deliveryId}`;
            return { trackingNumber, waybillUrl };
        } catch (error: any) {
             throw new Error(`Bosta Pipeline Error: ${error.response?.data?.message || 'Failed to dispatch shipment'}`);
        }
    }

    async trackShipment(trackingNumber: string): Promise<{ status: string; statusDate: Date }> {
        const response = await axios.get(`${this.baseUrl}/deliveries/${trackingNumber}`, { headers: this.headers });
        return {
            status: response.data.state, // Maps states like 'Package received', 'Delivered', 'Returned'
            statusDate: new Date()
        };
    }

    async cancelShipment(trackingNumber: string): Promise<boolean> {
        await axios.delete(`${this.baseUrl}/deliveries/${trackingNumber}`, { headers: this.headers });
        return true;
    }

    validateWebhookPayload(payload: any, signature: string): boolean {
        // Enforce provider strict Webhook Signature verifying mechanism using Node Crypto SHA256
        const payloadString = JSON.stringify(payload);
        const generatedHash = crypto.createHmac('sha256', this.apiKey).update(payloadString).digest('hex');
        
        return generatedHash === signature;
    }
}
