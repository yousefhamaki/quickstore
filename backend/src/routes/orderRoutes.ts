import express from 'express';
import { getOrders, getOrderById, updateOrderStatus, createOrder, addMerchantNote, getOrderStats } from '../controllers/orderController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);
router.use(authorize('merchant'));

router.route('/').get(getOrders).post(createOrder);
router.get('/stats', getOrderStats);
router.route('/:id').get(getOrderById);
router.route('/:id/status').put(updateOrderStatus);
router.route('/:id/notes').post(addMerchantNote);

export default router;
