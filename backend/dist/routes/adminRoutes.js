"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/receipts/pending', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('super_admin'), adminController_1.getPendingReceipts);
router.put('/receipts/:id', authMiddleware_1.protect, (0, authMiddleware_1.authorize)('super_admin'), adminController_1.reviewReceipt);
exports.default = router;
