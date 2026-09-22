import express from 'express';
import {
    getOverview,
    getRevenueChart,
    getTopProducts,
    getRecentOrders,
    getCustomerStats
} from '../controllers/analyticsController';
import { protect, authorize, requireStoreRole } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);
router.use(authorize('merchant'));
// Analytics/revenue data is manager-level, not plain 'staff' — see
// StoreStaff's role doc-comment. This resolves the store the same way
// analyticsController's own resolveStore(req) calls below do, just to gate
// the role first; the controllers' internal resolveStore call still runs
// and is unaffected.
router.use(requireStoreRole(['owner', 'manager']));

router.get('/overview', getOverview);
router.get('/revenue', getRevenueChart);
router.get('/top-products', getTopProducts);
router.get('/recent-orders', getRecentOrders);
router.get('/customers', getCustomerStats);

export default router;
