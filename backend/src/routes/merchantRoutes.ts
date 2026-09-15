import express from 'express';
import { setupStore, submitSubscription, getMyStore } from '../controllers/merchantController';
import { protect, authorize, requireOwnedStore } from '../middleware/authMiddleware';
import { upload } from '../config/cloudinary';

import { checkVerification } from '../middleware/verificationMiddleware';

import { billingContext, protectStoreLimit } from '../middleware/billingMiddleware';

const router = express.Router();

router.post('/store', protect, authorize('merchant'), checkVerification, billingContext, protectStoreLimit, setupStore);
router.get('/store', protect, authorize('merchant'), getMyStore);
// requireOwnedStore runs AFTER the multipart upload middleware since it
// needs req.body.storeId, which multer only populates once it has parsed
// the form — and BEFORE the controller, which used to trust req.body.storeId
// directly with no ownership check at all (a merchant could submit a
// payment receipt against another merchant's store).
router.post('/subscribe', protect, authorize('merchant'), upload.single('receipt'), requireOwnedStore, submitSubscription);

export default router;
