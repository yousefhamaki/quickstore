import express from 'express';
import { getAbandonedCarts, updateAbandonedCartStatus } from '../controllers/abandonedCartController';
import { protect, authorize } from '../middleware/authMiddleware';
import { billingContext } from '../middleware/billingMiddleware';
import { requireFeature } from '../middleware/featureGate';

const router = express.Router();

router.use(protect);
router.use(authorize('merchant'));
router.use(billingContext);

router.get('/', requireFeature('abandoned_cart'), getAbandonedCarts);
router.put('/:id', requireFeature('abandoned_cart'), updateAbandonedCartStatus);

export default router;
