import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import PaymentReceipt from '../models/PaymentReceipt';
import SubscriptionPlan from '../models/SubscriptionPlan';
import Store from '../models/Store';
import User from '../models/User';
import WalletLedger from '../models/WalletLedger';
import { getLatestSnapshot } from '../services/admin/analytics.service';
import { getAllMerchants, toggleMerchantStatus } from '../services/admin/merchant.service';
import { adjustBalance } from '../services/admin/wallet.service';
import { getAllStores, overrideSubscription, toggleStoreStatus } from '../services/admin/store.service';
import { getAllPlans, createPlan, updatePlan, deletePlan } from '../services/admin/plan.service';
import { getAllTickets, addReply, updateTicketStatus } from '../services/admin/ticket.service';
import { logAdminAction } from '../services/admin/audit.service';

const getIp = (req: AuthRequest): string | undefined => {
    return typeof req.ip === 'string' ? req.ip : undefined;
};

export const getAnalytics = async (req: AuthRequest, res: Response) => {
    try {
        const period = (req.query.period as 'hourly' | 'daily' | 'monthly') || 'daily';
        const snapshot = await getLatestSnapshot(period);
        res.json(snapshot);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const getMerchantsList = async (req: AuthRequest, res: Response) => {
    try {
        const merchants = await getAllMerchants();
        res.json(merchants);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const updateMerchantStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { isBlocked, reason } = req.body;
        if (isBlocked === undefined || !reason) {
            return res.status(400).json({ message: 'isBlocked and reason are required' });
        }
        const merchant = await toggleMerchantStatus(req.params.id as string, isBlocked, req.user._id, reason, getIp(req));
        res.json(merchant);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const adjustMerchantWallet = async (req: AuthRequest, res: Response) => {
    try {
        const { amount, type, reason } = req.body;
        if (!amount || !type || !reason) {
            return res.status(400).json({ message: 'amount, type, and reason are required' });
        }
        if (amount <= 0) {
            return res.status(400).json({ message: 'amount must be positive' });
        }
        const result = await adjustBalance(req.params.id as string, amount, type, req.user._id, reason, getIp(req));
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const getStoresList = async (req: AuthRequest, res: Response) => {
    try {
        const stores = await getAllStores();
        res.json(stores);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const overrideStoreSubscription = async (req: AuthRequest, res: Response) => {
    try {
        const { planId, durationDays, reason } = req.body;
        if (!planId || !durationDays || !reason) {
            return res.status(400).json({ message: 'planId, durationDays, and reason are required' });
        }
        const store = await overrideSubscription(req.params.id as string, planId, durationDays, req.user._id, reason, getIp(req));
        res.json(store);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const updateStoreStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { status, reason } = req.body;
        if (!status || !reason) {
            return res.status(400).json({ message: 'status and reason are required' });
        }
        const store = await toggleStoreStatus(req.params.id as string, status, req.user._id, reason, getIp(req));
        res.json(store);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const getPendingReceipts = async (req: AuthRequest, res: Response) => {
    try {
        const receipts = await PaymentReceipt.find({ status: 'pending' })
            .populate('merchantId', 'name email')
            .populate('planId')
            .populate('storeId', 'name');
        res.json(receipts);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const reviewReceipt = async (req: AuthRequest, res: Response) => {
    const { status, rejectionReason } = req.body;
    const receiptId = req.params.id as string;

    try {
        const receipt = await PaymentReceipt.findById(receiptId);
        if (!receipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }

        const beforeState = { status: receipt.status };
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

                await User.findByIdAndUpdate(receipt.merchantId, {
                    subscriptionStatus: 'active',
                    subscriptionPlan: plan._id,
                    subscriptionExpiry: expiryDate,
                });
            }
        } else {
            await Store.findByIdAndUpdate(receipt.storeId, {
                subscriptionStatus: 'none',
            });
            await User.findByIdAndUpdate(receipt.merchantId, {
                subscriptionStatus: 'expired',
            });
        }

        await logAdminAction(
            req.user._id,
            'receipt.review',
            'PaymentReceipt',
            receiptId,
            beforeState,
            { status },
            status === 'rejected' ? rejectionReason : 'Approved payment receipt',
            getIp(req)
        );

        res.json(receipt);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const getPlansList = async (req: AuthRequest, res: Response) => {
    try {
        const plans = await getAllPlans();
        res.json(plans);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const createPlanController = async (req: AuthRequest, res: Response) => {
    try {
        const plan = await createPlan(req.body, req.user._id, getIp(req));
        res.status(201).json(plan);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const updatePlanController = async (req: AuthRequest, res: Response) => {
    try {
        const { reason, ...data } = req.body;
        const plan = await updatePlan(req.params.id as string, data, req.user._id, reason || 'Modified plan limits', getIp(req));
        res.json(plan);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const deletePlanController = async (req: AuthRequest, res: Response) => {
    try {
        const reason = (req.query.reason as string) || 'Archived plan';
        const plan = await deletePlan(req.params.id as string, req.user._id, reason, getIp(req));
        res.json(plan);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const getTicketsList = async (req: AuthRequest, res: Response) => {
    try {
        const tickets = await getAllTickets(req.query);
        res.json(tickets);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const addTicketReplyController = async (req: AuthRequest, res: Response) => {
    try {
        const { message, attachments, internalNote } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'message is required' });
        }
        const ticket = await addReply(
            req.params.id as string,
            message,
            req.user.name,
            attachments,
            !!internalNote,
            req.user._id,
            getIp(req)
        );
        res.json(ticket);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const updateTicketStatusController = async (req: AuthRequest, res: Response) => {
    try {
        const { status, reason } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'status is required' });
        }
        const ticket = await updateTicketStatus(req.params.id as string, status, req.user._id, reason, getIp(req));
        res.json(ticket);
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// ─── Transactions ────────────────────────────────────────────────────────────

export const getTransactionsList = async (req: AuthRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, parseInt(req.query.limit as string) || 25);
        const skip = (page - 1) * limit;

        const filter: any = {};
        if (req.query.type) filter.type = req.query.type;
        if (req.query.reason) filter.reason = req.query.reason;
        if (req.query.from || req.query.to) {
            filter.createdAt = {};
            if (req.query.from) filter.createdAt.$gte = new Date(req.query.from as string);
            if (req.query.to) filter.createdAt.$lte = new Date(req.query.to as string);
        }

        const [transactions, total] = await Promise.all([
            WalletLedger.find(filter)
                .populate('userId', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            WalletLedger.countDocuments(filter)
        ]);

        res.json({
            transactions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

export const getTransactionStats = async (req: AuthRequest, res: Response) => {
    try {
        const filter: any = {};
        if (req.query.from || req.query.to) {
            filter.createdAt = {};
            if (req.query.from) filter.createdAt.$gte = new Date(req.query.from as string);
            if (req.query.to) filter.createdAt.$lte = new Date(req.query.to as string);
        }

        const [typeAgg, reasonAgg] = await Promise.all([
            WalletLedger.aggregate([
                { $match: filter },
                { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
            ]),
            WalletLedger.aggregate([
                { $match: filter },
                { $group: { _id: '$reason', total: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort: { total: -1 } }
            ])
        ]);

        const byType: Record<string, { total: number; count: number }> = {};
        for (const row of typeAgg) byType[row._id] = { total: row.total, count: row.count };

        res.json({
            totalDebited: byType['debit']?.total ?? 0,
            totalCredited: byType['credit']?.total ?? 0,
            debitCount: byType['debit']?.count ?? 0,
            creditCount: byType['credit']?.count ?? 0,
            byReason: reasonAgg.map(r => ({ reason: r._id, total: r.total, count: r.count }))
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};
