"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const analyticsController_1 = require("../controllers/analyticsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect);
router.use((0, authMiddleware_1.authorize)('merchant'));
router.get('/overview', analyticsController_1.getOverview);
router.get('/revenue', analyticsController_1.getRevenueChart);
router.get('/top-products', analyticsController_1.getTopProducts);
router.get('/recent-orders', analyticsController_1.getRecentOrders);
router.get('/customers', analyticsController_1.getCustomerStats);
exports.default = router;
