import { Response } from 'express';
import mongoose from 'mongoose';
import RefundRequest from '../models/RefundRequest';
import Order from '../models/Order';
import Store from '../models/Store';
import { AuthRequest, resolveStore } from '../middleware/authMiddleware';
import { CustomerAuthRequest } from '../middleware/customerAuthMiddleware';
import { applyOrderRefund, RefundValidationError } from './orderController';
import { createNotification } from '../services/notificationService';

// ============================================================
// Customer-facing (mounted under /api/account/:storeId/... — see
// customerAuthRoutes.ts, protected by protectCustomer)
// ============================================================

// @desc    Request a refund on one of the customer's own orders
// @route   POST /api/account/:storeId/orders/:orderId/refund-requests
// @access  Private/Customer
export const createRefundRequest = async (req: CustomerAuthRequest, res: Response) => {
    try {
        const storeId = req.params.storeId as string;
        const orderId = req.params.orderId as string;
        const { amount, reason, photoUrl, photoPublicId } = req.body;

        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ message: 'amount must be a positive number' });
        }
        if (!reason?.trim()) {
            return res.status(400).json({ message: 'A reason is required.' });
        }

        const order = await Order.findOne({ _id: orderId, storeId, customerId: req.customer._id });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (!['paid', 'partially_refunded'].includes(order.paymentStatus)) {
            return res.status(400).json({ message: 'This order is not eligible for a refund request.' });
        }

        const remaining = order.total - (order.refundedAmount || 0);
        if (numericAmount > remaining) {
            return res.status(400).json({ message: `You can request at most EGP ${remaining.toLocaleString()}.` });
        }

        const existingPending = await RefundRequest.findOne({ orderId, status: 'pending' });
        if (existingPending) {
            return res.status(409).json({ message: 'A refund request for this order is already pending.' });
        }

        const request = await RefundRequest.create({
            storeId,
            orderId,
            customerId: req.customer._id,
            requestedAmount: numericAmount,
            reason: reason.trim(),
            photoUrl,
            photoPublicId
        });

        const store = await Store.findById(storeId).select('ownerId');
        if (store) {
            createNotification({
                userId: store.ownerId.toString(),
                storeId,
                type: 'refund_requested',
                title: 'Refund request received',
                message: `A customer requested a refund of EGP ${numericAmount.toLocaleString()} for order #${order.orderNumber}.`,
                link: `/dashboard/stores/${storeId}/refund-requests`,
            }).catch(() => {});
        }

        res.status(201).json(request);
    } catch (error) {
        console.error('Create Refund Request Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    List the logged-in customer's own refund requests (optionally for one order)
// @route   GET /api/account/:storeId/refund-requests
// @access  Private/Customer
export const getMyRefundRequests = async (req: CustomerAuthRequest, res: Response) => {
    try {
        const storeId = req.params.storeId as string;
        const filter: any = { storeId, customerId: req.customer._id };
        if (req.query.orderId) filter.orderId = req.query.orderId;

        const requests = await RefundRequest.find(filter).sort({ createdAt: -1 }).lean();
        res.json(requests);
    } catch (error) {
        console.error('List My Refund Requests Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// ============================================================
// Merchant-facing (mounted at /api/refund-requests — protect + authorize('merchant'))
// ============================================================

// @desc    List refund requests for the merchant's store
// @route   GET /api/refund-requests
// @access  Private/Merchant
export const getRefundRequests = async (req: AuthRequest, res: Response) => {
    try {
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const filter: any = { storeId: store._id };
        if (req.query.status) filter.status = req.query.status;

        const requests = await RefundRequest.find(filter)
            .populate('orderId', 'orderNumber total refundedAmount paymentStatus')
            .populate('customerId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .lean();

        res.json(requests);
    } catch (error) {
        console.error('List Refund Requests Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Approve a refund request — merchant sets the final amount (may
//          differ from what the customer asked for) and it's applied
//          through the same refund engine as a direct merchant refund.
// @route   PUT /api/refund-requests/:id/approve
// @access  Private/Merchant
export const approveRefundRequest = async (req: AuthRequest, res: Response) => {
    let session: mongoose.ClientSession | null = null;
    try {
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const request = await RefundRequest.findOne({ _id: req.params.id, storeId: store._id });
        if (!request) {
            return res.status(404).json({ message: 'Refund request not found' });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'This request has already been resolved.' });
        }

        const finalAmount = req.body.amount !== undefined ? Number(req.body.amount) : request.requestedAmount;

        session = await mongoose.startSession();
        session.startTransaction();

        const order = await Order.findOne({ _id: request.orderId, storeId: store._id }).session(session);
        if (!order) {
            await session.abortTransaction();
            return res.status(404).json({ message: 'Order not found' });
        }

        await applyOrderRefund(
            order,
            store,
            finalAmount,
            req.body.note?.trim() || `Approved refund request: ${request.reason}`,
            req.user._id,
            session
        );
        await order.save({ session });

        request.status = 'approved';
        request.finalAmount = finalAmount;
        request.merchantResponseNote = req.body.note?.trim();
        request.resolvedAt = new Date();
        request.resolvedBy = req.user._id;
        await request.save({ session });

        await session.commitTransaction();
        res.json(request);
    } catch (error) {
        if (session) await session.abortTransaction();
        if (error instanceof RefundValidationError) {
            return res.status(error.status).json({ message: error.message });
        }
        console.error('Approve Refund Request Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    } finally {
        if (session) session.endSession();
    }
};

// @desc    Reject a refund request — no financial effect, just records why.
// @route   PUT /api/refund-requests/:id/reject
// @access  Private/Merchant
export const rejectRefundRequest = async (req: AuthRequest, res: Response) => {
    try {
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        if (!req.body.note?.trim()) {
            return res.status(400).json({ message: 'A note explaining the rejection is required.' });
        }

        const request = await RefundRequest.findOne({ _id: req.params.id, storeId: store._id });
        if (!request) {
            return res.status(404).json({ message: 'Refund request not found' });
        }
        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'This request has already been resolved.' });
        }

        request.status = 'rejected';
        request.merchantResponseNote = req.body.note.trim();
        request.resolvedAt = new Date();
        request.resolvedBy = req.user._id;
        await request.save();

        res.json(request);
    } catch (error) {
        console.error('Reject Refund Request Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
