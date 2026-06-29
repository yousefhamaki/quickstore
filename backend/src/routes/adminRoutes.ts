import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { can } from '../middleware/policyMiddleware';
import { checkIdempotency } from '../middleware/idempotencyMiddleware';
import {
    getAnalytics,
    getMerchantsList,
    updateMerchantStatus,
    adjustMerchantWallet,
    getStoresList,
    overrideStoreSubscription,
    updateStoreStatus,
    getPendingReceipts,
    reviewReceipt,
    getPlansList,
    createPlanController,
    updatePlanController,
    deletePlanController,
    getTicketsList,
    addTicketReplyController,
    updateTicketStatusController
} from '../controllers/adminController';

const router = express.Router();

router.use(protect);

router.get('/analytics', can('analytics.view'), getAnalytics);

router.get('/merchants', can('merchants.view'), getMerchantsList);
router.put('/merchants/:id/status', can('merchants.status'), updateMerchantStatus);
router.post('/merchants/:id/wallet/adjust', can('merchants.wallet'), checkIdempotency, adjustMerchantWallet);

router.get('/stores', can('stores.view'), getStoresList);
router.put('/stores/:id/subscription', can('stores.subscription'), overrideStoreSubscription);
router.put('/stores/:id/status', can('stores.status'), updateStoreStatus);

router.get('/receipts/pending', can('receipts.view'), getPendingReceipts);
router.put('/receipts/:id', can('receipts.review'), checkIdempotency, reviewReceipt);

router.get('/plans', can('plans.view'), getPlansList);
router.post('/plans', can('plans.create'), createPlanController);
router.put('/plans/:id', can('plans.update'), updatePlanController);
router.delete('/plans/:id', can('plans.delete'), deletePlanController);

router.get('/tickets', can('tickets.view'), getTicketsList);
router.post('/tickets/:id/reply', can('tickets.reply'), addTicketReplyController);
router.put('/tickets/:id/status', can('tickets.status'), updateTicketStatusController);

export default router;
