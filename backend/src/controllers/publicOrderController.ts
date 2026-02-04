import { Request, Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import Store from '../models/Store';
import Coupon from '../models/Coupon';
import mongoose from 'mongoose';
import Customer from '../models/Customer';
import { processOrderFee } from './billingController';

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

            // Numeric safety check/fix
            if (typeof product.inventory?.quantity !== 'number') {
                await Product.collection.updateOne(
                    { _id: product._id },
                    { $set: { "inventory.quantity": 0 } }
                );
            }

            // Stock check (if tracking enabled)
            if (product.trackInventory && (product.inventory.quantity ?? 0) < item.quantity) {
                console.warn(`Stock low for ${product.name}: available ${product.inventory.quantity}, requested ${item.quantity}`);
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

            // Optional: Decrease inventory with safety checks
            for (const item of items) {
                try {
                    await Product.findByIdAndUpdate(item._id, {
                        $inc: { "inventory.quantity": -Number(item.quantity) }
                    }, { session: session || undefined });
                } catch (invError) {
                    console.error(`Failed to update inventory for product ${item._id}:`, invError);
                }
            }

            if (session) await session.commitTransaction();

            res.status(201).json({
                success: true,
                orderNumber: createdOrder.orderNumber,
                orderId: createdOrder._id
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
