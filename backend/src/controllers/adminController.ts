import { Request, Response } from 'express';
import PaymentReceipt from '../models/PaymentReceipt';
import Store from '../models/Store';
import SubscriptionPlan from '../models/SubscriptionPlan';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Get all pending receipts
// @route   GET /api/admin/receipts/pending
// @access  Private (Super Admin)
export const getPendingReceipts = async (req: AuthRequest, res: Response) => {
    try {
        const receipts = await PaymentReceipt.find({ status: 'pending' })
            .populate('merchantId', 'name email')
            .populate('planId')
            .populate('storeId', 'name');
        res.json(receipts);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
};

// @desc    Approve or reject receipt
// @route   PUT /api/admin/receipts/:id
// @access  Private (Super Admin)
export const reviewReceipt = async (req: AuthRequest, res: Response) => {
    const { status, rejectionReason } = req.body;
    const receiptId = req.params.id;

    try {
        const receipt = await PaymentReceipt.findById(receiptId);
        if (!receipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }

        receipt.status = status;
        receipt.reviewedBy = req.user._id;
        receipt.reviewDate = new Date();
        if (status === 'rejected') {
            receipt.rejectionReason = rejectionReason;
        }
        await receipt.save();

        if (status === 'approved') {
            const plan = await SubscriptionPlan.findById(receipt.planId);
            if (plan) {
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + plan.duration);

                await Store.findByIdAndUpdate(receipt.storeId, {
                    subscriptionStatus: 'active',
                    subscriptionPlan: plan._id,
                    expiryDate: expiryDate,
                });
            }
        } else {
            await Store.findByIdAndUpdate(receipt.storeId, {
                subscriptionStatus: 'none',
            });
        }

        res.json(receipt);
    } catch (error) {
        res.status(500).json({ message: error instanceof Error ? error.message : 'Server error' });
    }
};
