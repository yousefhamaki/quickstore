import express from 'express';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon } from '../controllers/couponController';
import { protect, authorize } from '../middleware/authMiddleware';
import { billingContext } from '../middleware/billingMiddleware';
import { requireFeature } from '../middleware/featureGate';

const router = express.Router();

// All coupon routes require merchant authentication and specific plan feature
router.use(protect);
router.use(authorize('merchant'));
router.use(billingContext);

router.get('/', requireFeature('coupons'), getCoupons);
router.post('/', requireFeature('coupons'), createCoupon);
router.put('/:id', requireFeature('coupons'), updateCoupon);
router.delete('/:id', requireFeature('coupons'), deleteCoupon);

export default router;
