import express from 'express';
import { generateCopy, getAIUsage } from '../controllers/aiMarketingController';
import { protect, authorize } from '../middleware/authMiddleware';
import { billingContext } from '../middleware/billingMiddleware';
import { requireFeature } from '../middleware/featureGate';

const router = express.Router();

router.use(protect);
router.use(authorize('merchant'));
router.use(billingContext);

router.get('/usage', requireFeature('ai_marketing'), getAIUsage);
router.post('/generate', requireFeature('ai_marketing'), generateCopy);

export default router;
