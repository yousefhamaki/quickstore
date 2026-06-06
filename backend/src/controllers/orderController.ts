import { Response } from 'express';
import Order from '../models/Order';
import Store from '../models/Store';
import Customer from '../models/Customer';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/authMiddleware';
import InventoryLog from '../models/InventoryLog';
import mongoose from 'mongoose';

// @desc    Get all orders for a store
// @route   GET /api/orders
// @access  Private/Merchant
export const getOrders = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user._id;
        const { storeId, status, search, pageNumber } = req.query;

        let query: any = {};

        if (storeId) {
            // Verify store belongs to merchant
            const store = await Store.findOne({ _id: storeId, ownerId: userId });
            if (!store) {
                return res.status(404).json({ message: 'Store not found or unauthorized' });
            }
            query.storeId = storeId;
        } else {
            // Get all stores owned by merchant
            const stores = await Store.find({ ownerId: userId });
            const storeIds = stores.map(store => store._id);
            query.storeId = { $in: storeIds };
        }

        const pageSize = 20;
        const page = Number(pageNumber) || 1;

        if (status) {
            query.status = status;
        }

        if (search) {
            query.orderNumber = { $regex: search, $options: 'i' };
        }

        const count = await Order.countDocuments(query);
        const orders = await Order.find(query)
            .populate('customerId', 'firstName lastName email')
            .populate('storeId', 'name')
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));

        res.json({ orders, page, pages: Math.ceil(count / pageSize) });
    } catch (error) {
        console.error('Get Orders Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private/Merchant
export const getOrderById = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const order = await Order.findOne({ _id: req.params.id, storeId: store._id })
            .populate('customerId', 'firstName lastName email phone')
            .populate('items.productId', 'name images');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Merchant
export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
    let session: mongoose.ClientSession | null = null;
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const { status } = req.body;
        const oldStatus = req.body.oldStatus; // Frontend should ideally pass this, or we fetch it.

        // Start transaction
        session = await mongoose.startSession();
        session.startTransaction();

        const order = await Order.findOne({ _id: req.params.id, storeId: store._id }).session(session);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const previousStatus = order.status;
        order.status = status;
        order.timeline.push({
            status,
            timestamp: new Date(),
            note: `Status updated to ${status} by merchant`
        });

        // Inventory Logic based on status transition
        if (previousStatus === 'pending' && status !== 'pending') {
            // Moving out of pending
            if (['cancelled', 'refunded'].includes(status)) {
                // RELEASE Reservation
                for (const item of order.items) {
                    const product = await Product.findById(item.productId).session(session);
                    if (product && product.trackInventory) {
                        const updateQuery = item.variantId
                            ? { "variants._id": item.variantId }
                            : {};

                        const updateAction = item.variantId
                            ? { "variants.$.reserved": -item.quantity, "inventory.reserved": -item.quantity }
                            : { "inventory.reserved": -item.quantity };

                        const updatedProduct = await Product.findOneAndUpdate(
                            { _id: item.productId, ...updateQuery },
                            { $inc: updateAction },
                            { session, new: true }
                        );

                        if (updatedProduct) {
                            const variant = item.variantId
                                ? updatedProduct.variants.find((v: any) => v._id.toString() === item.variantId?.toString())
                                : null;

                            const calculatedPrevBalance = item.variantId
                                    ? (variant?.inventory || 0) - ((variant?.reserved || 0) + item.quantity)
                                    : (updatedProduct.inventory.quantity || 0) - ((updatedProduct.inventory.reserved || 0) + item.quantity);
                            
                            const calculatedNewBalance = item.variantId
                                    ? (variant?.inventory || 0) - (variant?.reserved || 0)
                                    : (updatedProduct.inventory.quantity || 0) - (updatedProduct.inventory.reserved || 0);

                            await InventoryLog.create([{
                                storeId: store._id,
                                productId: item.productId,
                                variantId: item.variantId,
                                orderId: order._id,
                                type: 'RELEASE',
                                amount: item.quantity,
                                previousBalance: calculatedPrevBalance,
                                newBalance: calculatedNewBalance,
                                reason: `Order #${order.orderNumber} ${status} - stock released`
                            }], { session });
                            
                            // -- CACHE INVALIDATION (Refund/Cancel Sync) --
                            try {
                                const { redisClient } = await import('../config/redis');
                                const { clearStoreProductCaches } = await import('./productController');
                                
                                await redisClient.unlink(`product:${item.productId}`);
                                
                                // CACHE THRASHING PROTECTION: Only wipe the store list cache if stock goes from 0 back to >0 (Item Back in Stock)
                                if (calculatedPrevBalance === 0 && calculatedNewBalance > 0) {
                                    await clearStoreProductCaches(store._id.toString());
                                }
                            } catch (e) {
                                console.warn('Refund cache wipe failed:', e);
                            }
                        }
                    }
                }
            } else if (['processing', 'shipped', 'delivered'].includes(status)) {
                // CAPTURE Reservation (Deduct inventory AND reserved)
                for (const item of order.items) {
                    const product = await Product.findById(item.productId).session(session);
                    if (product && product.trackInventory) {
                        const updateQuery = item.variantId
                            ? { "variants._id": item.variantId }
                            : {};

                        const updateAction = item.variantId
                            ? {
                                "variants.$.inventory": -item.quantity,
                                "variants.$.reserved": -item.quantity,
                                "inventory.quantity": -item.quantity,
                                "inventory.reserved": -item.quantity
                            }
                            : {
                                "inventory.quantity": -item.quantity,
                                "inventory.reserved": -item.quantity
                            };

                        const updatedProduct = await Product.findOneAndUpdate(
                            { _id: item.productId, ...updateQuery },
                            { $inc: updateAction },
                            { session, new: true }
                        );

                        if (updatedProduct) {
                            const variant = item.variantId
                                ? updatedProduct.variants.find((v: any) => v._id.toString() === item.variantId?.toString())
                                : null;

                            await InventoryLog.create([{
                                storeId: store._id,
                                productId: item.productId,
                                variantId: item.variantId,
                                orderId: order._id,
                                type: 'SALE',
                                amount: item.quantity,
                                previousBalance: item.variantId
                                    ? (variant?.inventory || 0 + item.quantity) - (variant?.reserved || 0 + item.quantity)
                                    : (updatedProduct.inventory.quantity || 0 + item.quantity) - (updatedProduct.inventory.reserved || 0 + item.quantity),
                                newBalance: item.variantId
                                    ? (variant?.inventory || 0) - (variant?.reserved || 0)
                                    : (updatedProduct.inventory.quantity || 0) - (updatedProduct.inventory.reserved || 0),
                                reason: `Order #${order.orderNumber} ${status} - stock captured`
                            }], { session });
                        }
                    }
                }
            }
        }

        const updatedOrder = await order.save({ session });
        await session.commitTransaction();
        res.json(updatedOrder);
    } catch (error) {
        if (session) await session.abortTransaction();
        console.error('Update Order Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    } finally {
        if (session) session.endSession();
    }
};

// @desc    Create new order (Merchant Manual Creation or Testing)
// @route   POST /api/orders
// @access  Private/Merchant
export const createOrder = async (req: AuthRequest, res: Response) => {
    try {
        const {
            storeId,
            customerId,
            items,
            subtotal,
            shipping,
            tax,
            discount,
            total,
            paymentMethod,
            shippingAddress,
            billingAddress,
            customerNote
        } = req.body;

        const store = await Store.findOne({ _id: storeId, ownerId: req.user._id }).populate({
            path: 'subscriptionId',
            populate: { path: 'planId' }
        });

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Calculate transaction fee based on plan
        const plan = (store.subscriptionId as any)?.planId;
        const feePercent = plan?.transactionFeePercent || 0;
        const transactionFee = Number((total * (feePercent / 100)).toFixed(2));

        // Generate Order Number
        const count = await Order.countDocuments({ storeId: store._id });
        const orderNumber = `#QS-${1000 + count + 1}`;

        const order = await Order.create({
            storeId: store._id,
            customerId,
            orderNumber,
            items,
            subtotal,
            shipping,
            tax,
            discount,
            total,
            transactionFee, // Track platform fee
            paymentMethod,
            shippingAddress,
            billingAddress,
            customerNote,
            timeline: [{
                status: 'pending',
                timestamp: new Date(),
                note: 'Order created'
            }]
        });

        // Update Store Stats
        store.stats.totalOrders += 1;
        store.stats.totalRevenue += total;
        await store.save();

        res.status(201).json(order);
    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Add merchant note to order
// @route   POST /api/orders/:id/notes
// @access  Private/Merchant
export const addMerchantNote = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const { note } = req.body;
        const order = await Order.findOne({ _id: req.params.id, storeId: store._id });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.merchantNote = note;
        await order.save();

        res.json({ message: 'Note added successfully', order });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private/Merchant
export const getOrderStats = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const totalOrders = await Order.countDocuments({ storeId: store._id });
        const pendingOrders = await Order.countDocuments({ storeId: store._id, status: 'pending' });
        const processingOrders = await Order.countDocuments({ storeId: store._id, status: 'processing' });
        const shippedOrders = await Order.countDocuments({ storeId: store._id, status: 'shipped' });
        const deliveredOrders = await Order.countDocuments({ storeId: store._id, status: 'delivered' });

        // Calculate total revenue
        const revenueResult = await Order.aggregate([
            { $match: { storeId: store._id, paymentStatus: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
        ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        res.json({
            totalOrders,
            pendingOrders,
            processingOrders,
            shippedOrders,
            deliveredOrders,
            totalRevenue
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};
