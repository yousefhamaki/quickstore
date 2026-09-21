import { IShippingProvider } from './IShippingProvider';
import { IOrder } from '../../models/Order';
import { IStore } from '../../models/Store';
import * as soap from 'soap';
import * as path from 'path';
import * as fs from 'fs';

export interface AramexCredentials {
    accountNumber: string;
    accountPin: string;
    accountEntity: string;
    accountCountryCode: string;
    username: string;
    password: string;
}

export type AramexNormalizedStatus = 'pending' | 'ready_for_pickup' | 'picked_up' | 'in_transit' | 'delivered' | 'returned';

// Aramex's TrackShipments/webhook-less polling returns free-text English
// status strings (UpdateCode/UpdateDescription, e.g. 'SH005 - Shipment
// delivered', 'Shipment Picked up', 'Delivery Attempted', 'Returned to
// shipper') — collapsed onto Order.shippingStatus's enum. Best-effort
// substring matching since Aramex doesn't publish a fixed closed enum of
// status strings.
export function normalizeAramexState(state: string | undefined): AramexNormalizedStatus {
    const s = (state || '').toLowerCase();
    if (!s) return 'pending';
    if (s.includes('deliver') && !s.includes('attempt') && !s.includes('fail')) return 'delivered';
    if (s.includes('return')) return 'returned';
    if (s.includes('pick') && s.includes('up')) return 'picked_up';
    if (s.includes('shipment created') || s.includes('data received') || s.includes('shipment created by')) return 'ready_for_pickup';
    return 'in_transit';
}

// Sandbox (test) endpoints — do NOT point these at production.
const SHIPPING_ENDPOINT = 'https://ws.sbx.aramex.net/shippingapi.v2/shipping/service_1_0.svc';
const TRACKING_ENDPOINT = 'https://ws.sbx.aramex.net/shippingapi.v2/tracking/service_1_0.svc';

/**
 * Bulletproof WSDL directory path resolution for dev (ts-node/tsx) and prod
 * (dist/JS) — mirrors services/emailService.ts's getTemplatesDir(), since
 * `tsc` doesn't copy non-.ts files (the vendored .wsdl contracts) into dist.
 */
function getWsdlDir(): string {
    const pathsToSearch = [
        path.join(process.cwd(), 'src/services/shipping/wsdl'),
        path.join(__dirname, 'wsdl'),
        path.join(__dirname, '../../../src/services/shipping/wsdl'),
        path.join(__dirname, '../../src/services/shipping/wsdl')
    ];

    for (const searchPath of pathsToSearch) {
        if (fs.existsSync(searchPath)) {
            return searchPath;
        }
    }

    console.error('[AramexShippingService] wsdl directory not found. Searched paths:', pathsToSearch);
    return path.join(process.cwd(), 'src/services/shipping/wsdl');
}

// SOAP clients are expensive to build (WSDL parsing) and stateless once
// built (the endpoint is fixed, credentials travel per-request in the
// payload) — memoize one client promise per WSDL so repeated
// createShipment/trackShipment calls across requests reuse them.
let shippingClientPromise: Promise<soap.Client> | null = null;
let trackingClientPromise: Promise<soap.Client> | null = null;

function getShippingClient(): Promise<soap.Client> {
    if (!shippingClientPromise) {
        const wsdlPath = path.join(getWsdlDir(), 'aramex-shipping-services.wsdl');
        shippingClientPromise = soap.createClientAsync(wsdlPath, { endpoint: SHIPPING_ENDPOINT })
            .then((client) => {
                client.setEndpoint(SHIPPING_ENDPOINT);
                return client;
            })
            .catch((err) => {
                shippingClientPromise = null; // allow retry on next call instead of caching a rejected promise forever
                throw err;
            });
    }
    return shippingClientPromise;
}

function getTrackingClient(): Promise<soap.Client> {
    if (!trackingClientPromise) {
        const wsdlPath = path.join(getWsdlDir(), 'aramex-tracking-services.wsdl');
        trackingClientPromise = soap.createClientAsync(wsdlPath, { endpoint: TRACKING_ENDPOINT })
            .then((client) => {
                client.setEndpoint(TRACKING_ENDPOINT);
                return client;
            })
            .catch((err) => {
                trackingClientPromise = null;
                throw err;
            });
    }
    return trackingClientPromise;
}

export class AramexShippingService implements IShippingProvider {
    private credentials: AramexCredentials;

    constructor(credentials: AramexCredentials) {
        this.credentials = credentials;
    }

    private get clientInfo() {
        return {
            UserName: this.credentials.username,
            Password: this.credentials.password,
            Version: 'v1.0',
            AccountNumber: this.credentials.accountNumber,
            AccountPin: this.credentials.accountPin,
            AccountEntity: this.credentials.accountEntity,
            AccountCountryCode: this.credentials.accountCountryCode,
            Source: 24
        };
    }

    async createShipment(order: IOrder, store: IStore): Promise<{ trackingNumber: string; waybillUrl: string }> {
        const client = await getShippingClient();

        const buildParty = (opts: {
            personName: string;
            companyName: string;
            phone: string;
            email: string;
            line1: string;
            city: string;
            state: string;
            postCode: string;
            countryCode: string;
            type: 'Supplier' | 'Recipient';
            accountNumber: string;
        }) => ({
            Reference1: '',
            Reference2: '',
            AccountNumber: opts.accountNumber,
            PartyAddress: {
                Line1: opts.line1 || 'N/A',
                Line2: '',
                Line3: '',
                City: opts.city || 'Cairo',
                StateOrProvinceCode: opts.state || '',
                PostCode: opts.postCode || '',
                CountryCode: opts.countryCode || 'EG'
            },
            Contact: {
                Department: '',
                PersonName: opts.personName || 'Customer',
                Title: '',
                CompanyName: opts.companyName,
                PhoneNumber1: opts.phone || '00000000000',
                PhoneNumber1Ext: '',
                PhoneNumber2: '',
                PhoneNumber2Ext: '',
                FaxNumber: '',
                CellPhone: opts.phone || '00000000000',
                EmailAddress: opts.email || '',
                Type: opts.type
            }
        });

        const totalItems = order.items.reduce((acc, i) => acc + i.quantity, 0) || 1;
        const isCod = order.paymentMethod === 'cod';

        const shipment: any = {
            Reference1: order.orderNumber,
            Reference2: '',
            Reference3: '',
            Shipper: buildParty({
                personName: store.name || 'Store Owner',
                companyName: store.name || 'Store',
                phone: store.contact?.phone || '',
                email: store.contact?.email || '',
                line1: store.contact?.address || 'Store Main Address',
                city: 'Cairo',
                state: '',
                postCode: '',
                countryCode: 'EG',
                type: 'Supplier',
                accountNumber: this.credentials.accountNumber
            }),
            Consignee: buildParty({
                personName: order.shippingAddress.fullName,
                companyName: '',
                phone: order.shippingAddress.phone,
                email: '',
                line1: order.shippingAddress.address || 'Standard Address',
                city: order.shippingAddress.city || 'Cairo',
                state: order.shippingAddress.state || '',
                postCode: order.shippingAddress.postalCode || '',
                countryCode: order.shippingAddress.country || 'EG',
                type: 'Recipient',
                accountNumber: ''
            }),
            ShippingDateTime: new Date().toISOString(),
            Details: {
                Dimensions: { Length: 10, Width: 10, Height: 10, Unit: 'CM' },
                ActualWeight: { Unit: 'KG', Value: 1 },
                ChargeableWeight: { Unit: 'KG', Value: 1 },
                DescriptionOfGoods: `Order ${order.orderNumber}`,
                GoodsOriginCountry: 'EG',
                NumberOfPieces: totalItems,
                ProductGroup: 'DOM',
                ProductType: 'OND',
                PaymentType: 'P',
                PaymentOptions: 'CASH',
                ...(isCod ? { CashOnDeliveryAmount: { CurrencyCode: 'EGP', Value: order.total } } : {})
            }
        };

        const request = {
            ClientInfo: this.clientInfo,
            Transaction: { Reference1: order.orderNumber },
            Shipments: { Shipment: [shipment] },
            LabelInfo: { ReportID: 9201, ReportType: 'URL' }
        };

        let response: any;
        try {
            const [result] = await client.CreateShipmentsAsync(request);
            response = result;
        } catch (error: any) {
            throw new Error(`Aramex Pipeline Error: ${error.message || 'Failed to dispatch shipment'}`);
        }

        if (response.HasErrors) {
            const notifications = response.Notifications?.Notification;
            const messages = Array.isArray(notifications)
                ? notifications.map((n: any) => `${n.Code}: ${n.Message}`).join('; ')
                : notifications
                    ? `${notifications.Code}: ${notifications.Message}`
                    : 'Unknown Aramex error';
            throw new Error(`Aramex Pipeline Error: ${messages}`);
        }

        const processedShipments = response.Shipments?.ProcessedShipment;
        const processedShipment = Array.isArray(processedShipments) ? processedShipments[0] : processedShipments;

        if (!processedShipment?.ID) {
            throw new Error('Aramex Pipeline Error: No shipment ID returned.');
        }

        // ShipmentLabel.LabelURL is the documented field for the AWB/label
        // location per Aramex's own WSDL contract (ProcessedShipment ->
        // ShipmentLabel -> LabelURL). Not live-verified against a real
        // response — see AramexShippingService's report caveat.
        const waybillUrl = processedShipment.ShipmentLabel?.LabelURL || '';

        return { trackingNumber: processedShipment.ID, waybillUrl };
    }

    async trackShipment(trackingNumber: string): Promise<{ status: string; statusDate: Date }> {
        const client = await getTrackingClient();

        const request = {
            ClientInfo: this.clientInfo,
            Transaction: { Reference1: trackingNumber },
            Shipments: { string: [trackingNumber] },
            GetLastTrackingUpdateOnly: false
        };

        let response: any;
        try {
            const [result] = await client.TrackShipmentsAsync(request);
            response = result;
        } catch (error: any) {
            throw new Error(`Aramex Tracking Error: ${error.message || 'Failed to fetch tracking status'}`);
        }

        if (response.HasErrors) {
            const notifications = response.Notifications?.Notification;
            const messages = Array.isArray(notifications)
                ? notifications.map((n: any) => `${n.Code}: ${n.Message}`).join('; ')
                : notifications
                    ? `${notifications.Code}: ${notifications.Message}`
                    : 'Unknown Aramex error';
            throw new Error(`Aramex Tracking Error: ${messages}`);
        }

        // Response is a dictionary keyed by shipment (waybill) number, whose
        // value is an array of TrackingResult entries (one per status
        // update event) — take the entry with the latest UpdateDateTime.
        const entries = response.TrackingResults?.KeyValueOfstringArrayOfTrackingResultmFAkxlpY;
        const entryList = Array.isArray(entries) ? entries : entries ? [entries] : [];
        const matchingEntry = entryList.find((e: any) => e.Key === trackingNumber) || entryList[0];

        const results = matchingEntry?.Value?.TrackingResult;
        const resultList = Array.isArray(results) ? results : results ? [results] : [];

        if (resultList.length === 0) {
            return { status: 'Unknown', statusDate: new Date() };
        }

        const latest = resultList.reduce((latestSoFar: any, current: any) => {
            const currentDate = new Date(current.UpdateDateTime).getTime();
            const latestDate = new Date(latestSoFar.UpdateDateTime).getTime();
            return currentDate >= latestDate ? current : latestSoFar;
        }, resultList[0]);

        return {
            status: latest.UpdateDescription || latest.UpdateCode || 'Unknown',
            statusDate: latest.UpdateDateTime ? new Date(latest.UpdateDateTime) : new Date()
        };
    }

    async cancelShipment(_trackingNumber: string): Promise<boolean> {
        // Aramex's Shipping Services API has no single-shipment cancel
        // operation — only CancelPickup, which cancels a *pickup request*
        // (a courier collection appointment), not a created shipment/AWB.
        // Rather than silently no-op or call the wrong endpoint, this is
        // surfaced honestly as unsupported.
        throw new Error('Aramex does not support cancelling a created shipment via this API (only CancelPickup, a different operation, exists).');
    }

    validateWebhookPayload(_payload: any, _signature: string): boolean {
        // Aramex has no documented merchant-configurable webhook for this
        // API surface — status changes are only observable by polling
        // trackShipment. Always false so an unsigned/unexpected call to the
        // shared webhook route never gets treated as valid for this
        // provider.
        return false;
    }
}
