import { Response } from 'express';
import Order, { IOrder } from '../models/Order';
import Store, { IStore } from '../models/Store';
import Customer from '../models/Customer';
import { ShippingFactory } from '../services/shipping/ShippingFactory';
import { AuthRequest, resolveStore } from '../middleware/authMiddleware';
import { createNotification } from '../services/notificationService';
import { sendOrderShippedEmail } from '../services/emailService';

/**
 * Emails the customer that their order has shipped, linking to the
 * carrier's own tracking page when one is known, or this store's
 * track-order page otherwise (so the email is useful either way). Never
 * thrown from — a failed notification email must not fail the tracking
 * update it's describing.
 */
async function notifyCustomerOrderShipped(order: IOrder, store: IStore) {
    try {
        const customer = await Customer.findById(order.customerId);
        if (!customer?.email) return;

        const storeDomainBase = process.env.STORE_DOMAIN_BASE || 'quickstore.live';
        const storeHost = (store.domain.customDomain && store.domain.isVerified)
            ? store.domain.customDomain
            : `${store.domain.subdomain}.${storeDomainBase}`;
        const protocol = storeHost.includes('localhost') ? 'http' : 'https';

        const trackUrl = order.trackingUrl || `${protocol}://${storeHost}/track-order`;

        await sendOrderShippedEmail(
            store,
            customer.email,
            order.orderNumber,
            order.shippingProvider || 'Courier',
            order.trackingNumber || '',
            trackUrl
        );
    } catch (error) {
        console.error('[ShippingController] Failed to send order-shipped email:', error);
    }
}

// @desc    Generate a real courier waybill (Bosta/Aramex) for an order — sets
//          trackingNumber/waybillUrl and marks it ready for pickup.
// @route   POST /api/shipping/waybill/:orderId
// @access  Private/Merchant
export const generateWaybill = async (req: AuthRequest, res: Response) => {
    try {
        // Resolves storeId from body/query/header/param and verifies it's
        // owned by the logged-in merchant — the same guard every other
        // order-mutating endpoint in orderController.ts uses. Without this,
        // any authenticated merchant could generate a waybill for ANY
        // store's order just by guessing an orderId.
        const store = await resolveStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const order = await Order.findOne({ _id: req.params.orderId, storeId: store._id });
        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Instantiate the specific Provider via Strategy Factory correctly configured with encrypted credentials
        const provider = ShippingFactory.getProvider(store);

        // Execute the 3rd party REST call safely
        const { trackingNumber, waybillUrl } = await provider.createShipment(order, store);

        const providerName = store.settings?.shipping?.provider || 'local';
        order.trackingNumber = trackingNumber;
        order.waybillUrl = waybillUrl;
        order.shippingProvider = providerName;
        order.shippingStatus = 'ready_for_pickup';
        order.timeline.push({
            status: `Waybill generated via ${providerName.toUpperCase()}`,
            timestamp: new Date(),
            note: trackingNumber
        });

        await order.save();
        notifyCustomerOrderShipped(order, store).catch(() => {});

        res.json({ trackingNumber, waybillUrl, message: 'Shipment dispatched successfully' });
    } catch (error: any) {
        console.error('Shipping Provider Subsystem Error:', error);
        // Guarantee Node process survives external API outages
        res.status(500).json({ message: error.message || 'Failed to negotiate with shipping provider' });
    }
};

// @desc    Pull the live tracking status from the courier's API (Bosta/Aramex only —
//          manually-entered tracking has no API to poll).
// @route   GET /api/shipping/track/:orderId
// @access  Private/Merchant
export const trackShipment = async (req: AuthRequest, res: Response) => {
    try {
        const store = await resolveStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const order = await Order.findOne({ _id: req.params.orderId, storeId: store._id });
        if (!order || !order.trackingNumber) return res.status(404).json({ message: 'No tracking active' });

        const provider = ShippingFactory.getProvider(store);
        const liveStatus = await provider.trackShipment(order.trackingNumber);
        res.json(liveStatus);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Manually set/update this order's carrier + tracking number (+ an optional
//          tracking link) — the only path available for 'local'/self-managed
//          shipping, where there's no courier API to call at all. Also works
//          as a manual override for API-integrated providers if a merchant
//          ever needs to correct something by hand.
// @route   PUT /api/shipping/orders/:orderId/tracking
// @access  Private/Merchant
export const setManualTracking = async (req: AuthRequest, res: Response) => {
    try {
        const { carrierName, trackingNumber, trackingUrl } = req.body;

        if (!carrierName?.trim()) {
            return res.status(400).json({ message: 'Carrier name is required.' });
        }
        if (!trackingNumber?.trim()) {
            return res.status(400).json({ message: 'Tracking number is required.' });
        }
        if (trackingUrl && !/^https?:\/\//i.test(trackingUrl.trim())) {
            return res.status(400).json({ message: 'Tracking URL must start with http:// or https://' });
        }

        const store = await resolveStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const order = await Order.findOne({ _id: req.params.orderId, storeId: store._id });
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const isFirstTimeSet = !order.trackingNumber;

        order.shippingProvider = carrierName.trim();
        order.trackingNumber = trackingNumber.trim();
        order.trackingUrl = trackingUrl?.trim() || undefined;
        // Only advance shippingStatus forward on the FIRST time tracking is
        // added — editing an existing tracking number later (e.g. fixing a
        // typo) shouldn't silently reset a further-along status like
        // 'in_transit' back to 'ready_for_pickup'.
        if (isFirstTimeSet && order.shippingStatus === 'pending') {
            order.shippingStatus = 'ready_for_pickup';
        }
        order.timeline.push({
            status: isFirstTimeSet ? 'Tracking info added' : 'Tracking info updated',
            timestamp: new Date(),
            note: `${carrierName.trim()} — ${trackingNumber.trim()}`,
        });

        await order.save();

        if (isFirstTimeSet) {
            createNotification({
                userId: store.ownerId.toString(),
                storeId: store._id.toString(),
                type: 'order_shipped',
                title: 'Shipment tracking added',
                message: `Order #${order.orderNumber} is now tracked via ${carrierName.trim()}.`,
                link: `/dashboard/stores/${store._id}/orders/${order._id}`,
            }).catch(() => {});
            notifyCustomerOrderShipped(order, store).catch(() => {});
        }

        res.json(order);
    } catch (error: any) {
        console.error('[ShippingController] setManualTracking failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
