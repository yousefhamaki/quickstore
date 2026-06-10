"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const storeController_1 = require("../controllers/storeController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const verificationMiddleware_1 = require("../middleware/verificationMiddleware");
const billingMiddleware_1 = require("../middleware/billingMiddleware");
const cloudinary_1 = require("../config/cloudinary");
const router = express_1.default.Router();
// All routes require merchant authentication
router.use(authMiddleware_1.protect);
router.use((0, authMiddleware_1.authorize)('merchant'));
// Store CRUD
router.route('/').get(storeController_1.getStores).post(verificationMiddleware_1.checkVerification, billingMiddleware_1.billingContext, billingMiddleware_1.protectStoreLimit, storeController_1.createStore);
router.route('/:id').get(storeController_1.getStore).put(storeController_1.updateStore).delete(storeController_1.deleteStore);
// Store Logo Upload
router.post('/:id/upload-logo', cloudinary_1.upload.single('logo'), storeController_1.uploadStoreLogo);
// Store Publishing
router.post('/:id/publish', billingMiddleware_1.billingContext, billingMiddleware_1.protectStorePublish, storeController_1.publishStore);
router.post('/:id/unpublish', storeController_1.unpublishStore);
router.post('/:id/pause', storeController_1.pauseStore);
router.post('/:id/resume', billingMiddleware_1.billingContext, billingMiddleware_1.checkServiceAvailability, storeController_1.resumeStore);
// Store Preview
router.post('/:id/preview-token', storeController_1.generatePreviewToken);
// Utilities
router.get('/check-subdomain/:subdomain', storeController_1.checkSubdomainAvailability);
router.get('/:id/checklist', storeController_1.getOnboardingChecklist);
exports.default = router;
