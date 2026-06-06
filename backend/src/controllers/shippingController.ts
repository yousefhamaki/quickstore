import { Request, Response } from 'express';
import Order from '../models/Order';
import Store from '../models/Store';
import { ShippingFactory } from '../services/shipping/ShippingFactory';

export const generateWaybill = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findById(orderId).populate('storeId');
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const store = await Store.findById(order.storeId);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        // Instantiate the specific Provider via Strategy Factory correctly configured with encrypted credentials
        const provider = ShippingFactory.getProvider(store);
        
        // Execute the 3rd party REST call safely
        const { trackingNumber, waybillUrl } = await provider.createShipment(order, store);

        // Update standard Mongo schemas natively
        order.trackingNumber = trackingNumber;
        order.waybillUrl = waybillUrl;
        order.shippingProvider = store.settings?.shipping?.provider || 'local';
        order.shippingStatus = 'ready_for_pickup';
        order.timeline.push({
            status: `Waybill generated via ${order.shippingProvider.toUpperCase()}`,
            timestamp: new Date(),
            note: trackingNumber
        });
        
        await order.save();

        res.json({ trackingNumber, waybillUrl, message: 'Shipment dispatched successfully' });
    } catch (error: any) {
        console.error('Shipping Provider Subsystem Error:', error);
        // Guarantee Node process survives external API outages
        res.status(500).json({ message: error.message || 'Failed to negotiate with shipping provider' });
    }
};

export const trackShipment = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        if (!order || !order.trackingNumber) return res.status(404).json({ message: 'No tracking active' });

        const store = await Store.findById(order.storeId);
        const provider = ShippingFactory.getProvider(store as any);
        
        const liveStatus = await provider.trackShipment(order.trackingNumber);
        res.json(liveStatus);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
