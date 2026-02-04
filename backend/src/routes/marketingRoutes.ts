import express from 'express';
import { updatePixels, updateSEO, getMarketingSettings } from '../controllers/marketingController';
import { protect, authorize } from '../middleware/authMiddleware';
import { billingContext } from '../middleware/billingMiddleware';
import { requireFeature } from '../middleware/featureGate';

const router = express.Router();

router.use(protect);
router.use(authorize('merchant'));
router.use(billingContext);

router.get('/settings', getMarketingSettings);
router.put('/pixels', requireFeature('pixels'), updatePixels);
router.put('/seo', requireFeature('seo'), updateSEO);

export default router;
