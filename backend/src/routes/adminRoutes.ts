import express from 'express';
import { getPendingReceipts, reviewReceipt } from '../controllers/adminController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/receipts/pending', protect, authorize('super_admin'), getPendingReceipts);
router.put('/receipts/:id', protect, authorize('super_admin'), reviewReceipt);

export default router;
