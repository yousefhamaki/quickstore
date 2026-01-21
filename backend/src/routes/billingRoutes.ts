import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { handlePaymobWebhook } from '../controllers/webhookController';
import {
    getPlans,
    getCurrentSubscription,
    subscribe,
    getBillingOverview,
    updateBillingProfile,
    rechargeWallet,
    getTransactions,
    getReceipts
} from '../controllers/billingController';

const router = express.Router();

router.post('/webhook/paymob', handlePaymobWebhook);

router.get('/plans', getPlans); // Public? Or protected? Let's keep public for marketing, but currently using AuthRequest so strictness might vary.
// Actually controller uses AuthRequest but doesn't assume user exists for public getPlans usually. 
// My controller code for getPlans didn't use req.user, so it is safe.

router.use(protect);
router.get('/subscription', getCurrentSubscription);
router.post('/subscribe', subscribe);
router.get('/overview', getBillingOverview);
router.put('/profile', updateBillingProfile);
router.post('/wallet/recharge', rechargeWallet);
router.get('/transactions', getTransactions);
router.get('/receipts', getReceipts);

export default router;
