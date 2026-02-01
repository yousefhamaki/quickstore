import express from 'express';
import { setupStore, submitSubscription, getMyStore } from '../controllers/merchantController';
import { protect, authorize } from '../middleware/authMiddleware';
import { upload } from '../config/cloudinary';

import { checkVerification } from '../middleware/verificationMiddleware';

import { billingContext, protectStoreLimit } from '../middleware/billingMiddleware';

const router = express.Router();

router.post('/store', protect, authorize('merchant'), checkVerification, billingContext, protectStoreLimit, setupStore);
router.get('/store', protect, authorize('merchant'), getMyStore);
router.post('/subscribe', protect, authorize('merchant'), upload.single('receipt'), submitSubscription);

export default router;
