"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const storeController_1 = require("../controllers/storeController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// All routes require merchant authentication
router.use(authMiddleware_1.protect);
router.use((0, authMiddleware_1.authorize)('merchant'));
// Store CRUD
router.route('/').get(storeController_1.getStores).post(storeController_1.createStore);
router.route('/:id').get(storeController_1.getStore).put(storeController_1.updateStore).delete(storeController_1.deleteStore);
// Store Publishing
router.post('/:id/publish', storeController_1.publishStore);
router.post('/:id/unpublish', storeController_1.unpublishStore);
router.post('/:id/pause', storeController_1.pauseStore);
router.post('/:id/resume', storeController_1.resumeStore);
// Store Preview
router.post('/:id/preview-token', storeController_1.generatePreviewToken);
// Utilities
router.get('/check-subdomain/:subdomain', storeController_1.checkSubdomainAvailability);
router.get('/:id/checklist', storeController_1.getOnboardingChecklist);
exports.default = router;
