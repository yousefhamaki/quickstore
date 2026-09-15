import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import Store from '../models/Store';
import Subscription from '../models/Subscription';
import WhatsAppConnection from '../models/WhatsAppConnection';
import WhatsAppLedgerEntry from '../models/WhatsAppLedgerEntry';
import { WhatsAppCreditService } from '../services/WhatsAppCreditService';
import { startConnection, stopConnection } from '../services/whatsapp/connectionManager';

async function ownedStore(req: AuthRequest) {
    return Store.findOne({ _id: req.params.id, ownerId: req.user._id });
}

// @desc    Start (or resume) a store's WhatsApp connection — generates a QR to scan
// @route   POST /api/stores/:id/whatsapp/connect
// @access  Private/Merchant
export const connectWhatsApp = async (req: AuthRequest, res: Response) => {
    try {
        const store = await ownedStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        // Plan gating: SubscriptionPlan.features.allowWhatsApp must be true
        // to even START a connection — checked here (not just hidden in
        // the dashboard UI) so a direct API call can't bypass it, same
        // FEATURE_LOCKED pattern already used for heroSlider/customDomain
        // in storeController.ts. WhatsAppCreditService.getCreditBalance is
        // the second, independent enforcement point (0 allowance without
        // this flag), so even a race between a downgrade and a connect
        // attempt still can't grant messages the plan doesn't include.
        const subscription = await Subscription.findOne({ userId: req.user._id }).populate('planId');
        const plan = subscription?.planId as any;
        if (!subscription || subscription.status !== 'active' || !plan?.features?.allowWhatsApp) {
            return res.status(403).json({
                message: 'WhatsApp is not included in your current plan. Upgrade to a plan with WhatsApp support to connect.',
                code: 'FEATURE_LOCKED'
            });
        }

        await startConnection(store._id);
        res.json({ message: 'Connecting — scan the QR code shown to link your WhatsApp.' });
    } catch (error) {
        console.error('Connect WhatsApp Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Poll the current connection status/QR for a store
// @route   GET /api/stores/:id/whatsapp/status
// @access  Private/Merchant
export const getWhatsAppStatus = async (req: AuthRequest, res: Response) => {
    try {
        const store = await ownedStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        const connection = await WhatsAppConnection.findOne({ storeId: store._id });
        res.json({
            status: connection?.status || 'disconnected',
            qrCode: connection?.qrCode || null,
            phoneNumber: connection?.phoneNumber || null,
            displayName: connection?.displayName || null
        });
    } catch (error) {
        console.error('Get WhatsApp Status Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Disconnect a store's WhatsApp — logs out and clears the saved session
// @route   POST /api/stores/:id/whatsapp/disconnect
// @access  Private/Merchant
export const disconnectWhatsApp = async (req: AuthRequest, res: Response) => {
    try {
        const store = await ownedStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found' });

        await stopConnection(store._id);
        res.json({ message: 'Disconnected' });
    } catch (error) {
        console.error('Disconnect WhatsApp Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get a store's WhatsApp credit balance + recent ledger history
// @route   GET /api/stores/:id/whatsapp/account
// @access  Private/Merchant
export const getWhatsAppAccountBalance = async (req: AuthRequest, res: Response) => {
    try {
        const store = await ownedStore(req);
        if (!store) return res.status(404).json({ message: 'Store not found or unauthorized' });

        const balanceInfo = await WhatsAppCreditService.getCreditBalance(store._id);
        const ledgerHistory = await WhatsAppLedgerEntry.find({ storeId: store._id }).sort({ createdAt: -1 }).limit(50);

        const sub = await Subscription.findOne({ userId: store.ownerId }).populate('planId');
        const plan = sub?.planId as any;
        const planIsActive = !!(sub && sub.status === 'active');
        // Distinct from planIsActive — a merchant can have a perfectly
        // active subscription that simply doesn't include WhatsApp, and
        // the UI needs to tell those two "why is my limit 0" cases apart
        // ("no active plan" vs. "upgrade to get WhatsApp").
        const featureIncluded = planIsActive && !!plan?.features?.allowWhatsApp;
        const planRefreshAt = new Date(balanceInfo.lastRefreshedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

        res.json({
            balance: balanceInfo.balance,
            planBalance: balanceInfo.planBalance,
            purchasedBalance: balanceInfo.purchasedBalance,
            reserved: balanceInfo.reserved,
            planIsActive,
            featureIncluded,
            planRefreshAt,
            ledgerHistory
        });
    } catch (error) {
        console.error('Get WhatsApp Account Balance Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};
