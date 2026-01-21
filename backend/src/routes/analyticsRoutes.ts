import express from 'express';
import {
    getOverview,
    getRevenueChart,
    getTopProducts,
    getRecentOrders,
    getCustomerStats
} from '../controllers/analyticsController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);
router.use(authorize('merchant'));

router.get('/overview', getOverview);
router.get('/revenue', getRevenueChart);
router.get('/top-products', getTopProducts);
router.get('/recent-orders', getRecentOrders);
router.get('/customers', getCustomerStats);

export default router;
