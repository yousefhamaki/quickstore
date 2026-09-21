import { IShippingProvider } from './IShippingProvider';
import { IOrder } from '../../models/Order';
import { IStore } from '../../models/Store';
import axios from 'axios';
import crypto from 'crypto';

export interface JTExpressCredentials {
    apiAccount: string;
    customerCode: string;
    privateKey: string;
    password: string;
}

export type JTNormalizedStatus = 'pending' | 'ready_for_pickup' | 'picked_up' | 'in_transit' | 'delivered' | 'returned';

// J&T Express Egypt's `logistics/trace` status vocabulary is NOT documented
// anywhere publicly available and no real account/response has been seen —
// this is a best-effort substring guess pending real data. Flag prominently
// in any report: this mapping is UNVERIFIED.
export function normalizeJTState(status: string | undefined): JTNormalizedStatus {
    const s = (status || '').toLowerCase();
    if (!s) return 'pending';
    if (s.includes('delivered') || s.includes('sign')) return 'delivered';
    if (s.includes('return')) return 'returned';
    if (s.includes('pick')) return 'picked_up';
    if (s.includes('created') || s.includes('order') && s.includes('receiv')) return 'ready_for_pickup';
    return 'in_transit';
}

const BASE_URL = 'https://openapi.jtjms-eg.com/webopenplatformapi/api';

// J&T's fixed salt used in their business-digest formula (documented as a
// literal constant in their integration guide, not a secret).
const JT_BIZ_DIGEST_SALT = 'jadada236t2';

function md5(input: string): string {
    return crypto.createHash('md5').update(input, 'utf8').digest('hex');
}

/**
 * Per-request transport-level signature: base64(md5(bizContent + privateKey)).
 * Sent as the `digest` header alongside `apiAccount`/`timestamp` on every call.
 */
function computeDigest(bizContent: string, privateKey: string): string {
    const hash = crypto.createHash('md5').update(bizContent + privateKey, 'utf8').digest();
    return hash.toString('base64');
}

/**
 * Order-creation-specific business digest, per J&T's exact documented
 * formula: base64(md5(customerCode + upperCase(md5(password + "jadada236t2")) + privateKey)).
 * Exported standalone so its exact arithmetic (the one unambiguous,
 * verifiable-without-a-real-account piece of this integration) can be
 * sanity-checked independently of HTTP plumbing.
 */
export function computeJTBizDigest(customerCode: string, password: string, privateKey: string): string {
    const innerMd5Upper = md5(password + JT_BIZ_DIGEST_SALT).toUpperCase();
    const hash = crypto.createHash('md5').update(customerCode + innerMd5Upper + privateKey, 'utf8').digest();
    return hash.toString('base64');
}

export class JTExpressShippingService implements IShippingProvider {
    private credentials: JTExpressCredentials;

    constructor(credentials: JTExpressCredentials) {
        this.credentials = credentials;
    }

    private buildHeaders(bizContent: string) {
        return {
            'apiAccount': this.credentials.apiAccount,
            'timestamp': Date.now().toString(),
            'digest': computeDigest(bizContent, this.credentials.privateKey),
            'Content-Type': 'application/x-www-form-urlencoded'
        };
    }

    private async post(endpoint: string, bizContentObj: any): Promise<any> {
        const bizContent = JSON.stringify(bizContentObj);
        const headers = this.buildHeaders(bizContent);
        const body = new URLSearchParams();
        body.append('bizContent', bizContent);

        try {
            const response = await axios.post(`${BASE_URL}/${endpoint}`, body.toString(), { headers });
            return response.data;
        } catch (error: any) {
            throw new Error(`J&T Express Error (${endpoint}): ${error.response?.data?.msg || error.message || 'Request failed'}`);
        }
    }

    async createShipment(order: IOrder, store: IStore): Promise<{ trackingNumber: string; waybillUrl: string }> {
        const isCod = order.paymentMethod === 'cod';

        // NOTE (unverified): J&T's own documentation is ambiguous about
        // exactly which field name carries the order-creation business
        // digest inside `bizContent` for `order/addOrder`. This is a
        // best-effort placement (`digest` field alongside the order data) —
        // the digest VALUE itself is computed per J&T's documented formula
        // exactly (see computeJTBizDigest), which is the unambiguous part.
        const bizContent: any = {
            txlogisticId: order.orderNumber,
            customerCode: this.credentials.customerCode,
            digest: computeJTBizDigest(this.credentials.customerCode, this.credentials.password, this.credentials.privateKey),
            sender: {
                name: store.name || 'Store',
                mobile: store.contact?.phone || '',
                address: store.contact?.address || 'Store Main Address',
                city: 'Cairo',
                countryCode: 'EG'
            },
            receiver: {
                name: order.shippingAddress.fullName,
                mobile: order.shippingAddress.phone,
                address: order.shippingAddress.address || 'Standard Address',
                city: order.shippingAddress.city || 'Cairo',
                countryCode: order.shippingAddress.country || 'EG'
            },
            items: order.items.map((item) => ({
                itemName: item.name,
                number: item.quantity
            })),
            goodsValue: order.total,
            codAmount: isCod ? order.total : 0,
            payType: isCod ? 'CC_COD' : 'PP_PM',
            weight: 1
        };

        const data = await this.post('order/addOrder', bizContent);

        if (data?.code && data.code !== '1' && data.code !== 1 && data.success !== true) {
            throw new Error(`J&T Express Pipeline Error: ${data.msg || JSON.stringify(data)}`);
        }

        const trackingNumber = data?.data?.billCode || data?.data?.waybillNo || data?.data?.txlogisticId || order.orderNumber;

        return { trackingNumber, waybillUrl: '' };
    }

    async trackShipment(trackingNumber: string): Promise<{ status: string; statusDate: Date }> {
        const bizContent = { billCode: trackingNumber };
        const data = await this.post('logistics/trace', bizContent);

        const traces = data?.data?.[0]?.details || data?.data?.details || [];
        const latest = Array.isArray(traces) && traces.length > 0 ? traces[traces.length - 1] : null;

        return {
            status: latest?.scanTypeName || latest?.desc || data?.data?.status || 'Unknown',
            statusDate: latest?.scanTime ? new Date(latest.scanTime) : new Date()
        };
    }

    async cancelShipment(trackingNumber: string): Promise<boolean> {
        // Cancel is keyed by txlogisticId (the merchant's own order
        // reference), not the courier's waybill number — caller passes
        // whatever it has as `trackingNumber`; if the caller only tracks the
        // courier's returned tracking number, this may need to be looked up
        // by orderNumber instead once a real account confirms the exact
        // contract.
        const bizContent = { txlogisticId: trackingNumber };
        const data = await this.post('order/cancelOrder', bizContent);

        if (data?.code && data.code !== '1' && data.code !== 1 && data.success !== true) {
            throw new Error(`J&T Express Cancel Error: ${data.msg || JSON.stringify(data)}`);
        }
        return true;
    }

    validateWebhookPayload(_payload: any, _signature: string): boolean {
        // No documented merchant-side push webhook — logistics/trace polling
        // (trackShipment) is the only status-update mechanism.
        return false;
    }
}
