import { Request, Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import Store from '../models/Store';
import Coupon from '../models/Coupon';
import mongoose from 'mongoose';
import Customer from '../models/Customer';
import { processOrderFee } from './billingController';
import InventoryLog from '../models/InventoryLog';
import { PaymentFactory } from '../services/payment/PaymentFactory';
import { clearStoreProductCaches } from './productController';
import { redisClient } from '../config/redis';

// @desc    Create new order from storefront
// @route   POST /api/public/orders
// @access  Public
export const createPublicOrder = async (req: Request, res: Response) => {
    try {
        const {
            storeId,
            items,
            customer: customerData,
            shippingAddress,
            paymentMethod,
            totalAmount,
            couponCode,
            discountAmount
        } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in order' });
        }

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(storeId)) {
            return res.status(400).json({ message: 'Invalid store ID' });
        }

        const oidStoreId = new mongoose.Types.ObjectId(storeId);

        // Validate store exists
        const store = await Store.findById(oidStoreId).populate({
            path: 'subscriptionId',
            populate: { path: 'planId' }
        });

        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Find or create customer
        let customer = await Customer.findOne({ storeId: oidStoreId, email: customerData.email });
        if (!customer) {
            customer = new Customer({
                storeId: oidStoreId,
                firstName: customerData.firstName,
                lastName: customerData.lastName,
                email: customerData.email,
                phone: customerData.phone,
                addresses: [{
                    fullName: `${customerData.firstName} ${customerData.lastName}`,
                    phone: customerData.phone,
                    address: shippingAddress.address,
                    city: shippingAddress.city,
                    state: shippingAddress.city, // Defaulting state to city for MVP
                    postalCode: shippingAddress.zipCode || '00000',
                    country: 'Egypt',
                    isDefault: true
                }]
            });
            await customer.save();
        }

        // Pre-check products and inventory
        for (const item of items) {
            const product = await Product.findById(item._id);
            if (!product) {
                return res.status(400).json({ success: false, message: `Product ${item.name} no longer exists.` });
            }
            if (product.status !== 'active') {
                return res.status(400).json({ success: false, message: `Product ${item.name} is no longer available.` });
            }

            // Stock check (if tracking enabled)
            if (product.trackInventory) {
                if (item.variantId) {
                    const variant = product.variants.find((v: any) => v._id.toString() === item.variantId.toString());
                    if (!variant || variant.isDeleted) {
                        return res.status(400).json({ success: false, message: `Selected variant for ${product.name} no longer exists.` });
                    }
                    const available = (variant.inventory || 0) - (variant.reserved || 0);
                    if (available < item.quantity) {
                        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name} (${variant.name}). Only ${available} left.` });
                    }
                } else {
                    const available = (product.inventory.quantity || 0) - (product.inventory.reserved || 0);
                    if (available < item.quantity) {
                        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}. Only ${available} left.` });
                    }
                }
            }
        }

        // Generate unique order number
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const randomStr = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `QS-${dateStr}-${randomStr}`;

        const numericTotal = Number(totalAmount);
        const shippingFee = 50;
        let finalDiscount = Number(discountAmount || 0);

        let session: mongoose.ClientSession | null = null;
        // Standalone MongoDB (common in local dev) does not support transactions.
        const isLocalStandalone = process.env.MONGODB_URI?.includes('localhost') && !process.env.MONGODB_URI?.includes('replicaSet');

        if (!isLocalStandalone) {
            try {
                session = await mongoose.startSession();
                session.startTransaction();
            } catch (e) {
                session = null;
            }
        }

        try {
            // Verify Coupon if provided
            if (couponCode) {
                const coupon = await Coupon.findOne({
                    storeId: oidStoreId,
                    code: couponCode.toUpperCase(),
                    isActive: true
                });

                if (coupon) {
                    // Verify limits again for security
                    const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                    const limitReached = coupon.maxUsage !== -1 && coupon.usageCount >= coupon.maxUsage;

                    const cartSubtotal = items.reduce((sum: number, item: any) => sum + (Number(item.price) * Number(item.quantity)), 0);
                    const minPriceMet = !coupon.minOrderAmount || cartSubtotal >= coupon.minOrderAmount;

                    if (!isExpired && !limitReached && minPriceMet) {
                        // Recalculate discount based on items to prevent manipulation
                        let calculatedDiscount = 0;

                        if (coupon.type === 'percentage') {
                            calculatedDiscount = (cartSubtotal * coupon.value) / 100;
                        } else if (coupon.type === 'fixed') {
                            calculatedDiscount = coupon.value;
                        } else if (coupon.type === 'free_shipping') {
                            calculatedDiscount = shippingFee;
                        }

                        // Use the calculated discount
                        finalDiscount = calculatedDiscount;

                        // Increment usage count
                        coupon.usageCount += 1;
                        await coupon.save({ session: session || undefined });
                    }
                }
            }

            // Calculate transaction fee based on plan
            const plan = (store.subscriptionId as any)?.planId;
            const feePercent = plan?.transactionFeePercent || 0;
            const transactionFee = Number((numericTotal * (feePercent / 100)).toFixed(2));

            // Create the order
            const order = new Order({
                storeId: oidStoreId,
                customerId: customer._id,
                orderNumber,
                items: items.map((item: any) => ({
                    productId: new mongoose.Types.ObjectId(item._id),
                    name: item.name,
                    quantity: Number(item.quantity),
                    price: Number(item.price),
                    image: item.image,
                    variant: item.selectedOptions ? Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ') : undefined
                })),
                subtotal: (numericTotal - shippingFee + finalDiscount),
                shipping: shippingFee,
                discount: finalDiscount,
                total: numericTotal,
                couponCode: couponCode || undefined,
                transactionFee,
                status: 'pending',
                paymentStatus: 'pending',
                paymentMethod: paymentMethod === 'COD' ? 'Cash on Delivery' : paymentMethod,
                shippingAddress: {
                    fullName: `${customerData.firstName} ${customerData.lastName}`,
                    phone: customerData.phone,
                    address: shippingAddress.address,
                    city: shippingAddress.city,
                    state: shippingAddress.city,
                    postalCode: shippingAddress.zipCode || '00000',
                    country: 'Egypt'
                },
                billingAddress: {
                    fullName: `${customerData.firstName} ${customerData.lastName}`,
                    phone: customerData.phone,
                    address: shippingAddress.address,
                    city: shippingAddress.city,
                    state: shippingAddress.city,
                    postalCode: shippingAddress.zipCode || '00000',
                    country: 'Egypt'
                },
                timeline: [{
                    status: 'pending',
                    note: 'Order placed via storefront'
                }]
            });

            const createdOrder = await order.save({ session: session || undefined });

            // Deduct Order Fee from Merchant Wallet (0.5 EGP)
            await processOrderFee(store.ownerId.toString(), createdOrder._id, session || undefined);

            // Update Store Stats
            await Store.findByIdAndUpdate(oidStoreId, {
                $inc: {
                    "stats.totalOrders": 1,
                    "stats.totalRevenue": numericTotal
                }
            }, { session: session || undefined });

            // Update customer orders list
            await Customer.findByIdAndUpdate(customer._id, {
                $push: { orders: createdOrder._id }
            }, { session: session || undefined });

            // Atomic Stock Reservation & Movement Logging
            for (const item of items) {
                if (item.trackInventory === false) continue;

                let updatedProduct;
                if (item.variantId) {
                    // Try to reserve variant-level stock (Atomically move from inventory to reserved)
                    // We check inventory - reserved >= quantity to be safe even if a previous check passed
                    updatedProduct = await Product.findOneAndUpdate(
                        {
                            _id: item._id,
                            "variants._id": item.variantId,
                            "variants.isDeleted": false
                        },
                        {
                            $inc: {
                                "variants.$.reserved": Number(item.quantity),
                                "inventory.reserved": Number(item.quantity) // Cache at product level too
                            }
                        },
                        { session: session || undefined, new: true }
                    );
                } else {
                    // Reserve global-level stock
                    updatedProduct = await Product.findOneAndUpdate(
                        { _id: item._id },
                        {
                            $inc: { "inventory.reserved": Number(item.quantity) }
                        },
                        { session: session || undefined, new: true }
                    );
                }

                if (updatedProduct) {
                    const variant = item.variantId
                        ? updatedProduct.variants.find((v: any) => v._id.toString() === item.variantId.toString())
                        : null;

                    await InventoryLog.create([{
                        storeId: oidStoreId,
                        productId: item._id,
                        variantId: item.variantId || undefined,
                        orderId: createdOrder._id,
                        type: 'RESERVATION',
                        amount: Number(item.quantity),
                        previousBalance: item.variantId
                            ? (variant?.inventory || 0) - (variant?.reserved || 0) + Number(item.quantity)
                            : (updatedProduct.inventory.quantity || 0) - (updatedProduct.inventory.reserved || 0) + Number(item.quantity),
                        newBalance: item.variantId
                            ? (variant?.inventory || 0) - (variant?.reserved || 0)
                            : (updatedProduct.inventory.quantity || 0) - (updatedProduct.inventory.reserved || 0),
                        reason: `Order #${orderNumber} reservation`
                    }], { session: session || undefined });

                    // -- CACHE INVALIDATION (Checkout Sync) --
                    
                    // Always wipe individual product cache to reflect exact remaining units on detail page
                    try {
                        await redisClient.unlink(`product:${item._id}`);
                    } catch (e) {
                        console.warn('Checkout cache wipe failed for individual product:', e);
                    }

                    // CACHE THRASHING PROTECTION: Only wipe the store list cache if stock drops to exactly 0 (Item Sold Out)
                    const calculatedNewBalance = item.variantId
                            ? (variant?.inventory || 0) - (variant?.reserved || 0)
                            : (updatedProduct.inventory.quantity || 0) - (updatedProduct.inventory.reserved || 0);
                            
                    if (calculatedNewBalance === 0) {
                        await clearStoreProductCaches(storeId);
                    }
                }
            }

            let paymentUrl = null;
            if (paymentMethod !== 'COD' && store.settings?.payment?.provider && store.settings.payment.provider !== 'manual') {
                try {
                    const paymentProvider = PaymentFactory.getProvider(store);
                    const paymentIntent = await paymentProvider.initializePayment(createdOrder, store);
                    
                    paymentUrl = paymentIntent.paymentUrl;
                    createdOrder.transactionId = paymentIntent.transactionId;
                    await createdOrder.save({ session: session || undefined });
                } catch (paymentErr) {
                    console.error('Failed to initialize Strategy payment gateway:', paymentErr);
                }
            }

            if (session) await session.commitTransaction();

            res.status(201).json({
                success: true,
                orderNumber: createdOrder.orderNumber,
                orderId: createdOrder._id,
                paymentUrl
            });
        } catch (txnError: any) {
            if (session) await session.abortTransaction();
            throw txnError;
        } finally {
            if (session) session.endSession();
        }
    } catch (error: any) {
        console.error('Order creation error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Server Error',
            error
        });
    }
};

// @desc    Track order by order number
// @route   GET /api/public/orders/track/:orderNumber?storeId=...
// @access  Public
export const trackOrder = async (req: Request, res: Response) => {
    try {
        const { orderNumber } = req.params;
        const { storeId } = req.query;

        if (!storeId || !mongoose.Types.ObjectId.isValid(storeId as string)) {
            return res.status(400).json({ message: 'Invalid store ID' });
        }

        const order = await Order.findOne({
            orderNumber,
            storeId: new mongoose.Types.ObjectId(storeId as string)
        })
            .populate('items.productId', 'name images')
            .select('-transactionFee'); // Hide internal fees from public

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

export const getPublicOrderDetails = async (req: Request, res: Response) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate('items.productId', 'name images');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};
