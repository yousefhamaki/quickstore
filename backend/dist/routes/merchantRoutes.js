"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const merchantController_1 = require("../controllers/merchantController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const cloudinary_1 = require("../config/cloudinary");
const router = express_1.default.Router();
router.post('/store', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('merchant'), merchantController_1.setupStore);
router.get('/store', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('merchant'), merchantController_1.getMyStore);
router.post('/subscribe', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('merchant'), cloudinary_1.upload.single('receipt'), merchantController_1.submitSubscription);
exports.default = router;
