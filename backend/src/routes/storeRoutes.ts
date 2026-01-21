import express from 'express';
import {
    getStores,
    getStore,
    createStore,
    updateStore,
    deleteStore,
    publishStore,
    unpublishStore,
    pauseStore,
    resumeStore,
    generatePreviewToken,
    checkSubdomainAvailability,
    getOnboardingChecklist
} from '../controllers/storeController';
import { protect, authorize } from '../middleware/authMiddleware';
import { checkVerification } from '../middleware/verificationMiddleware';
import { billingContext, protectStoreLimit, protectStorePublish, checkServiceAvailability } from '../middleware/billingMiddleware';

const router = express.Router();

// All routes require merchant authentication
router.use(protect);
router.use(authorize('merchant'));

// Store CRUD
router.route('/').get(getStores).post(checkVerification, billingContext, protectStoreLimit, createStore);
router.route('/:id').get(getStore).put(updateStore).delete(deleteStore);

// Store Publishing
router.post('/:id/publish', billingContext, protectStorePublish, publishStore);
router.post('/:id/unpublish', unpublishStore);
router.post('/:id/pause', pauseStore);
router.post('/:id/resume', billingContext, checkServiceAvailability, resumeStore);

// Store Preview
router.post('/:id/preview-token', generatePreviewToken);

// Utilities
router.get('/check-subdomain/:subdomain', checkSubdomainAvailability);
router.get('/:id/checklist', getOnboardingChecklist);

export default router;
