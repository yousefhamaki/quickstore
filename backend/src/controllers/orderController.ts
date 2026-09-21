import { Response } from 'express';
import Order from '../models/Order';
import Store from '../models/Store';
import Customer from '../models/Customer';
import Product from '../models/Product';
import { AuthRequest, resolveStore } from '../middleware/authMiddleware';
import InventoryLog from '../models/InventoryLog';
import mongoose from 'mongoose';
import OfferCampaign from '../models/OfferCampaign';
import Wallet from '../models/Wallet';
import WalletLedger from '../models/WalletLedger';
import Coupon from '../models/Coupon';
import { WALLET_LEDGER_REASONS } from '../constants/walletLedgerReasons';
import { sendGatedCustomerEmail } from '../services/orderEmailService';
import { sendGatedWhatsAppMessage } from '../services/whatsapp/whatsappMessageService';
import { sendPostPurchaseVoucherEmail } from '../services/emailService';

/**
 * A short, readable one-time code for a post-purchase personal voucher —
 * "THANKS-" prefix so it's recognizable in a customer's inbox/wallet, plus
 * 6 random chars from an alphabet with ambiguous look-alikes (0/O, 1/I)
 * removed so it's easy to read back or type in.
 */
function generateVoucherCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let suffix = '';
    for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    return `THANKS-${suffix}`;
}

/** Retries a few times against the (storeId, code) unique index before falling back to a longer, effectively-collision-free code. */
async function generateUniqueVoucherCode(storeId: mongoose.Types.ObjectId, session: mongoose.ClientSession | null): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateVoucherCode();
        const existing = await Coupon.findOne({ storeId, code }).session(session);
        if (!existing) return code;
    }
    return `THANKS-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Emails the customer that their order's status changed, gated by the
 * store's own emailNotifications.sendStatusUpdates toggle and its email
 * credit balance (see sendGatedCustomerEmail). Never thrown from — a failed
 * notification email must not fail the status update it's describing.
 */
async function notifyCustomerStatusChanged(order: InstanceType<typeof Order>, store: InstanceType<typeof Store>, newStatus: string) {
    try {
        const customer = await Customer.findById(order.customerId);
        if (!customer) return;

        if (store.settings?.emailNotifications?.sendStatusUpdates !== false && customer.email) {
            await sendGatedCustomerEmail({
                store,
                type: 'orderStatusChanged',
                customerEmail: customer.email,
                vars: {
                    customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'there',
                    orderNumber: order.orderNumber,
                    status: newStatus,
                },
                context: `Order status update (${newStatus}) for order #${order.orderNumber} to ${customer.email}`,
                ledgerDescription: `Order status update email for order #${order.orderNumber}`,
                referenceId: order._id.toString(),
            });
        }

        if (store.settings?.whatsappNotifications?.sendStatusUpdates !== false && customer.phone) {
            await sendGatedWhatsAppMessage({
                store,
                type: 'orderStatusChanged',
                customerPhone: customer.phone,
                vars: {
                    customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'there',
                    orderNumber: order.orderNumber,
                    status: newStatus,
                },
                context: `Order status update (${newStatus}) for order #${order.orderNumber} to ${customer.phone}`,
                ledgerDescription: `Order status update WhatsApp message for order #${order.orderNumber}`,
                referenceId: order._id.toString(),
            });
        }
    } catch (error) {
        console.error('[OrderController] Failed to send order status changed notification:', error);
    }
}

// @desc    Get all orders for a store
// @route   GET /api/orders
// @access  Private/Merchant
export const getOrders = async (req: AuthRequest, res: Response) => {
    try {
        const { status, search, pageNumber } = req.query;

        // Resolves req.query.storeId (what the web dashboard's per-store
        // /dashboard/stores/[storeId]/orders page always sends) the same way
        // as getOrderStats/getProducts/issuePartialRefund below — including
        // the x-store-id header a caller without a storeId in the URL (the
        // mobile app) relies on. This used to fall back to "every store this
        // merchant owns" when neither was present, which silently mixed a
        // multi-store merchant's orders together instead of surfacing that
        // ambiguity; resolveStore's fallback ("the merchant's only store")
        // matches every other order/product/analytics endpoint instead.
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found or unauthorized' });
        }
        const query: any = { storeId: store._id };

        const pageSize = 20;
        const page = Number(pageNumber) || 1;

        if (status) {
            query.status = status;
        }

        if (search) {
            query.orderNumber = { $regex: search, $options: 'i' };
        }

        const [count, orders] = await Promise.all([
            Order.countDocuments(query),
            Order.find(query)
                .populate('customerId', 'firstName lastName email')
                .populate('storeId', 'name')
                .sort({ createdAt: -1 })
                .limit(pageSize)
                .skip(pageSize * (page - 1))
                .lean()
        ]);

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
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const order = await Order.findOne({ _id: req.params.id, storeId: store._id })
            .populate('customerId', 'firstName lastName email phone')
            .populate('items.productId', 'name images')
            .lean();

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
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const { status, reason } = req.body;
        const oldStatus = req.body.oldStatus; // Frontend should ideally pass this, or we fetch it.

        // Start transaction
        session = await mongoose.startSession();
        session.startTransaction();

        const order = await Order.findOne({ _id: req.params.id, storeId: store._id }).session(session);

        if (!order) {
            // Was previously a bare early return with the transaction left
            // open (never aborted/ended) — leaking a session on every
            // not-found request. abortTransaction() here; the outer
            // finally block still calls session.endSession() exactly once.
            await session.abortTransaction();
            return res.status(404).json({ message: 'Order not found' });
        }

        const previousStatus = order.status;

        // A refunded order is terminal — un-refunding would require
        // re-charging the platform fee, re-incrementing coupon usage, and
        // re-inflating store stats, none of which this endpoint is set up
        // to do safely, so it's simplest and safest to just disallow it.
        if (previousStatus === 'refunded' && status !== 'refunded') {
            await session.abortTransaction();
            return res.status(400).json({ message: 'This order has already been refunded and cannot change status further.' });
        }

        if (status === 'refunded' && previousStatus !== 'refunded' && !reason?.trim()) {
            await session.abortTransaction();
            return res.status(400).json({ message: 'A reason is required to refund an order.' });
        }

        order.status = status;
        order.timeline.push({
            status,
            timestamp: new Date(),
            note: status === 'refunded' && reason?.trim() ? `Refunded: ${reason.trim()}` : `Status updated to ${status} by merchant`
        });

        // Platform-side money reversal: the per-order fee charged at
        // checkout (processOrderFee in billingController.ts) and any coupon
        // usage it consumed were previously NEVER reversed when an order
        // was cancelled or refunded — the merchant kept paying for (and the
        // coupon stayed "used up" by) an order that didn't go through.
        // Fires once per order via refundSideEffectsApplied, on whichever of
        // 'cancelled'/'refunded' is reached first.
        if (['cancelled', 'refunded'].includes(status) && !order.refundSideEffectsApplied) {
            // Only reverse whatever fee HASN'T already been reversed by an
            // earlier partial refund (see issuePartialRefund) — feeReversedAmount
            // is the shared counter that prevents double-crediting the wallet.
            const feeRemaining = order.transactionFee - (order.feeReversedAmount || 0);
            if (feeRemaining > 0) {
                const updatedWallet = await Wallet.findOneAndUpdate(
                    { userId: store.ownerId },
                    { $inc: { balance: feeRemaining } },
                    { new: true, session }
                );
                if (updatedWallet) {
                    await WalletLedger.create([{
                        userId: store.ownerId,
                        type: 'credit',
                        amount: feeRemaining,
                        reason: WALLET_LEDGER_REASONS.ORDER_REFUND,
                        referenceId: order._id,
                        balanceAfter: updatedWallet.balance
                    }], { session });
                }
                order.feeReversedAmount = order.transactionFee;
            }

            if (order.couponCode) {
                await Coupon.updateOne(
                    { storeId: store._id, code: order.couponCode, usageCount: { $gt: 0 } },
                    { $inc: { usageCount: -1 } },
                    { session }
                );
            }

            // Same double-counting concern as the fee above: only reverse
            // the portion of revenue not already backed out by a prior
            // partial refund.
            const revenueRemaining = order.total - (order.refundedAmount || 0);
            await Store.findByIdAndUpdate(
                store._id,
                { $inc: { 'stats.totalOrders': -1, 'stats.totalRevenue': -revenueRemaining } },
                { session }
            );

            order.refundSideEffectsApplied = true;
        }

        if (status === 'refunded' && previousStatus !== 'refunded') {
            const remainingToRefund = order.total - (order.refundedAmount || 0);
            order.paymentStatus = 'refunded';
            if (remainingToRefund > 0) {
                order.refunds.push({
                    amount: remainingToRefund,
                    reason: reason.trim(),
                    refundedAt: new Date(),
                    refundedBy: req.user._id
                } as any);
                order.refundedAmount = order.total;
            }
        }
        // Revert or re-apply campaign analytics based on status
        if (['cancelled', 'refunded'].includes(status)) {
            if (order.offerAttribution && order.offerAttribution.length > 0) {
                for (const attr of order.offerAttribution) {
                    if (!attr.analyticsReversed) {
                        await OfferCampaign.findByIdAndUpdate(
                            attr.campaignId,
                            {
                                $inc: {
                                    totalAcceptances: -1,
                                    'analytics.acceptances': -1,
                                    'analytics.revenue': -attr.campaignRevenue,
                                    'analytics.generatedOrders': -1
                                }
                            },
                            { session }
                        );
                        attr.analyticsReversed = true;
                    }
                }
                order.markModified('offerAttribution');
            }
        } else if (['pending', 'confirmed', 'processing', 'shipped', 'delivered'].includes(status)) {
            if (order.offerAttribution && order.offerAttribution.length > 0) {
                for (const attr of order.offerAttribution) {
                    if (attr.analyticsReversed) {
                        await OfferCampaign.findByIdAndUpdate(
                            attr.campaignId,
                            {
                                $inc: {
                                    totalAcceptances: 1,
                                    'analytics.acceptances': 1,
                                    'analytics.revenue': attr.campaignRevenue,
                                    'analytics.generatedOrders': 1
                                }
                            },
                            { session }
                        );
                        attr.analyticsReversed = false;
                    }
                }
                order.markModified('offerAttribution');
            }
        }

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

        // ================================================================
        // Post-purchase personal voucher — automatically issued the FIRST
        // time this order reaches 'delivered' (guarded by voucherIssued,
        // the exact same one-time-side-effect pattern refundSideEffectsApplied
        // uses above so a merchant flipping status back and forth, or a
        // repeat save of the same status, never issues a second voucher for
        // one order). The Coupon is created inside this same transaction so
        // it's atomic with the order's voucherIssued flag; the email itself
        // is sent AFTER commit (see below), same treatment as
        // notifyCustomerStatusChanged.
        // ================================================================
        let issuedVoucher: { code: string; type: 'percentage' | 'fixed'; value: number; expiresAt: Date } | null = null;
        let voucherCustomerEmail: string | undefined;
        if (status === 'delivered' && previousStatus !== 'delivered' && !order.voucherIssued) {
            const voucherConfig = store.settings?.postPurchaseVoucher;
            const minTrigger = voucherConfig?.minOrderAmountToTrigger || 0;
            if (voucherConfig?.enabled && order.total >= minTrigger) {
                const voucherCustomer = await Customer.findById(order.customerId).session(session);
                if (voucherCustomer?.email) {
                    const code = await generateUniqueVoucherCode(store._id, session);
                    const expiresInDays = voucherConfig.expiresInDays || 30;
                    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

                    await Coupon.create([{
                        storeId: store._id,
                        code,
                        type: voucherConfig.type,
                        value: voucherConfig.value,
                        maxUsage: 1,
                        minOrderAmount: 0,
                        expiresAt,
                        isActive: true,
                        autoApply: false,
                        restrictedToCustomerEmail: voucherCustomer.email
                    }], { session });

                    issuedVoucher = { code, type: voucherConfig.type, value: voucherConfig.value, expiresAt };
                    voucherCustomerEmail = voucherCustomer.email;
                }
            }
            order.voucherIssued = true;
        }

        const updatedOrder = await order.save({ session });
        await session.commitTransaction();

        if (status !== previousStatus) {
            notifyCustomerStatusChanged(updatedOrder, store, status).catch(() => {});
        }

        if (issuedVoucher && voucherCustomerEmail) {
            sendPostPurchaseVoucherEmail(store, voucherCustomerEmail, {
                code: issuedVoucher.code,
                type: issuedVoucher.type,
                value: issuedVoucher.value,
                expiresAt: issuedVoucher.expiresAt,
                orderNumber: updatedOrder.orderNumber,
            }).catch((err) => console.error('[OrderController] Failed to send post-purchase voucher email:', err));
        }

        res.json(updatedOrder);
    } catch (error) {
        if (session) await session.abortTransaction();
        console.error('Update Order Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    } finally {
        if (session) session.endSession();
    }
};

/**
 * A validation failure from applyOrderRefund that should surface as a 4xx
 * to the HTTP caller, rather than the generic 500 an unexpected exception
 * would get.
 */
export class RefundValidationError extends Error {
    status: number;
    constructor(message: string, status = 400) {
        super(message);
        this.status = status;
    }
}

/**
 * Core money-and-bookkeeping logic for a partial (or top-up-to-full)
 * refund — shared by two entry points that must apply IDENTICAL financial
 * logic: the merchant's direct "Issue Refund" button (issuePartialRefund
 * below) and approving a customer's refund request
 * (refundRequestController.approveRefundRequest). Mutates `order` in place
 * (caller is responsible for `order.save({ session })` and committing the
 * transaction) and applies the wallet/store-stats side effects directly.
 *
 * Does NOT change order.status, release inventory, reverse coupon usage,
 * or reverse campaign analytics — this is for when the order still stands
 * (delivered, customer keeps the goods) but money is being given back.
 */
export const applyOrderRefund = async (
    order: InstanceType<typeof Order>,
    store: InstanceType<typeof Store>,
    numericAmount: number,
    reason: string,
    refundedByUserId: mongoose.Types.ObjectId | string,
    session: mongoose.ClientSession
) => {
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new RefundValidationError('amount must be a positive number');
    }
    if (!reason?.trim()) {
        throw new RefundValidationError('A reason is required to issue a refund.');
    }
    if (!['paid', 'partially_refunded'].includes(order.paymentStatus)) {
        throw new RefundValidationError('Only a paid order can be refunded.');
    }

    const remaining = order.total - (order.refundedAmount || 0);
    if (numericAmount > remaining) {
        throw new RefundValidationError(`Cannot refund more than the remaining balance of EGP ${remaining.toLocaleString()}.`);
    }

    order.refunds.push({
        amount: numericAmount,
        reason: reason.trim(),
        refundedAt: new Date(),
        refundedBy: refundedByUserId
    } as any);
    order.refundedAmount = (order.refundedAmount || 0) + numericAmount;
    order.paymentStatus = order.refundedAmount >= order.total ? 'refunded' : 'partially_refunded';
    order.timeline.push({
        status: order.paymentStatus,
        timestamp: new Date(),
        note: `Refunded EGP ${numericAmount.toLocaleString()}: ${reason.trim()}`
    });

    // Prorate the platform order-fee reversal to the fraction of the
    // order actually being refunded, capped at whatever fee hasn't
    // already been reversed (shared with updateOrderStatus's full
    // cancel/refund path via the same feeReversedAmount counter).
    if (order.transactionFee > 0) {
        const feeRemaining = order.transactionFee - (order.feeReversedAmount || 0);
        const proratedFee = Math.min(
            Math.round((order.transactionFee * (numericAmount / order.total)) * 100) / 100,
            feeRemaining
        );
        if (proratedFee > 0) {
            const updatedWallet = await Wallet.findOneAndUpdate(
                { userId: store.ownerId },
                { $inc: { balance: proratedFee } },
                { new: true, session }
            );
            if (updatedWallet) {
                await WalletLedger.create([{
                    userId: store.ownerId,
                    type: 'credit',
                    amount: proratedFee,
                    reason: WALLET_LEDGER_REASONS.ORDER_REFUND,
                    referenceId: order._id,
                    balanceAfter: updatedWallet.balance
                }], { session });
            }
            order.feeReversedAmount = (order.feeReversedAmount || 0) + proratedFee;
        }
    }

    // Revenue is reduced immediately by the refunded amount — a
    // subsequent full cancel (if it ever happens) only reverses
    // whatever's left, via the same refundedAmount-aware logic in
    // updateOrderStatus.
    await Store.findByIdAndUpdate(
        store._id,
        { $inc: { 'stats.totalRevenue': -numericAmount } },
        { session }
    );
};

// @desc    Issue a partial (or top-up-to-full) refund WITHOUT changing the
//          order's fulfillment status — for when the order still stands
//          (e.g. delivered, customer keeps the goods) but the merchant is
//          giving some money back: a damaged item, a goodwill gesture, a
//          shipping-fee refund, etc. Unlike marking the whole order
//          'refunded' (updateOrderStatus), this does NOT release inventory,
//          reverse coupon usage, or reverse campaign analytics — none of
//          that is appropriate when the sale itself still happened.
// @route   POST /api/orders/:id/refund
// @access  Private/Merchant
export const issuePartialRefund = async (req: AuthRequest, res: Response) => {
    let session: mongoose.ClientSession | null = null;
    try {
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        session = await mongoose.startSession();
        session.startTransaction();

        const order = await Order.findOne({ _id: req.params.id, storeId: store._id }).session(session);
        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Order not found' });
        }

        await applyOrderRefund(order, store, Number(req.body.amount), req.body.reason, req.user._id, session);

        const updatedOrder = await order.save({ session });
        await session.commitTransaction();
        res.json(updatedOrder);
    } catch (error) {
        if (session) await session.abortTransaction();
        if (error instanceof RefundValidationError) {
            return res.status(error.status).json({ message: error.message });
        }
        console.error('Issue Partial Refund Error:', error);
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
        const store = await resolveStore(req);
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
        const store = await resolveStore(req);
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
