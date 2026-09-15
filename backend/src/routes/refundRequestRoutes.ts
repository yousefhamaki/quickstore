import express from 'express';
import { getRefundRequests, approveRefundRequest, rejectRefundRequest } from '../controllers/refundRequestController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);
router.use(authorize('merchant'));

router.get('/', getRefundRequests);
router.put('/:id/approve', approveRefundRequest);
router.put('/:id/reject', rejectRefundRequest);

export default router;
