import { IShippingProvider } from './IShippingProvider';
import { IOrder } from '../../models/Order';
import { IStore } from '../../models/Store';
import axios from 'axios';

export interface MylerzCredentials {
    username: string;
    password: string;
}

export type MylerzNormalizedStatus = 'pending' | 'ready_for_pickup' | 'picked_up' | 'in_transit' | 'delivered' | 'returned';

// Mylerz's `Status` string vocabulary is NOT documented anywhere publicly
// available and no real account/response has been seen — this is a
// best-effort substring guess pending real data. Flag prominently in any
// report: this mapping is UNVERIFIED.
export function normalizeMylerzState(status: string | undefined): MylerzNormalizedStatus {
    const s = (status || '').toLowerCase();
    if (!s) return 'pending';
    if (s.includes('delivered')) return 'delivered';
    if (s.includes('return')) return 'returned';
    if (s.includes('pick')) return 'picked_up';
    if (s.includes('created') || s.includes('pending')) return 'ready_for_pickup';
    return 'in_transit';
}

// Mylerz's own API v1.3 docs list this staging base — a real merchant
// production account gets a different, HTTPS production base URL from
// Mylerz on signup. Overridable via MYLERZ_API_BASE_URL so a real account's
// base URL never has to be hardcoded here.
const DEFAULT_STAGING_BASE_URL = 'http://41.33.122.61:8888/MylerzIntegrationStaging/api';

function getBaseUrl(): string {
    return process.env.MYLERZ_API_BASE_URL || DEFAULT_STAGING_BASE_URL;
}

export class MylerzShippingService implements IShippingProvider {
    private credentials: MylerzCredentials;
    private baseUrl: string;
    // Cached per-instance so repeated calls within the same request/short
    // window don't re-authenticate every time; re-fetched once expired.
    private tokenCache: { accessToken: string; expiresAt: number } | null = null;

    constructor(credentials: MylerzCredentials) {
        this.credentials = credentials;
        this.baseUrl = getBaseUrl();
    }

    private async getAccessToken(): Promise<string> {
        if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
            return this.tokenCache.accessToken;
        }

        const params = new URLSearchParams();
        params.append('grant_type', 'password');
        params.append('username', this.credentials.username);
        params.append('password', this.credentials.password);

        try {
            const response = await axios.post(`${this.baseUrl}/token`, params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            const { access_token, expires_in } = response.data;
            // Refresh a little early (60s) to avoid racing token expiry mid-call.
            this.tokenCache = {
                accessToken: access_token,
                expiresAt: Date.now() + Math.max(0, ((expires_in || 3600) - 60)) * 1000
            };
            return access_token;
        } catch (error: any) {
            throw new Error(`Mylerz Auth Error: ${error.response?.data?.error_description || error.message || 'Failed to authenticate'}`);
        }
    }

    private async headers() {
        const token = await this.getAccessToken();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    async createShipment(order: IOrder, store: IStore): Promise<{ trackingNumber: string; waybillUrl: string }> {
        const isCod = order.paymentMethod === 'Cash on Delivery' || order.paymentMethod === 'cod';

        const payload = {
            PickupDueDate: new Date().toISOString(),
            Package_Serial: 1,
            Description: `Order ${order.orderNumber}`,
            Service_Type: 'DTD', // Door-to-door: the sensible default for standard e-commerce delivery
            Service: 'SD', // Standard delivery
            Service_Category: 'Delivery',
            Payment_Type: isCod ? 'COD' : 'PP',
            COD_Value: isCod ? order.total : 0,
            Customer_Name: order.shippingAddress.fullName,
            Mobile_No: order.shippingAddress.phone,
            Street: order.shippingAddress.address || 'Standard Address',
            Neighborhood: order.shippingAddress.city || 'Cairo',
            Country: order.shippingAddress.country || 'Egypt',
            Pieces: [
                { Description: `Order ${order.orderNumber}`, Weight: 1 }
            ]
        };

        try {
            const headers = await this.headers();
            const response = await axios.post(`${this.baseUrl}/Orders/AddOrders`, payload, { headers });

            const trackingNumber = response.data?.Packages?.[0]?.BarCode || response.data?.PickupOrderCode;
            if (!trackingNumber) {
                throw new Error('No BarCode/PickupOrderCode returned by Mylerz.');
            }

            // Mylerz's AddOrders response has no documented separate waybill
            // URL field — returning '' rather than guessing one. Confirm the
            // real response shape once a real account is available (see
            // report caveat).
            return { trackingNumber, waybillUrl: '' };
        } catch (error: any) {
            throw new Error(`Mylerz Pipeline Error: ${error.response?.data?.message || error.message || 'Failed to dispatch shipment'}`);
        }
    }

    async trackShipment(trackingNumber: string): Promise<{ status: string; statusDate: Date }> {
        const headers = await this.headers();
        const response = await axios.get(`${this.baseUrl}/Packages/GetPackageStatus`, {
            headers,
            params: { AWB: trackingNumber }
        });

        return {
            status: response.data?.Status,
            statusDate: new Date()
        };
    }

    async cancelShipment(_trackingNumber: string): Promise<boolean> {
        // No documented single-package cancel endpoint in Mylerz's v1.3 API
        // surface has been confirmed — surfaced honestly rather than
        // guessing an endpoint that might not exist.
        throw new Error('Mylerz shipment cancellation is not supported by this integration.');
    }

    validateWebhookPayload(_payload: any, _signature: string): boolean {
        // No documented merchant webhook — GetPackageStatus polling
        // (trackShipment) is the only status-update mechanism.
        return false;
    }
}
