import express from 'express';
import { getMerchantReviews, updateReviewStatus, replyToReview, deleteReview } from '../controllers/reviewController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);
router.use(authorize('merchant'));

router.get('/', getMerchantReviews);
router.put('/:id/status', updateReviewStatus);
router.post('/:id/reply', replyToReview);
router.delete('/:id', deleteReview);

export default router;
