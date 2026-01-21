"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const orderController_1 = require("../controllers/orderController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.use(authMiddleware_1.protect);
router.use((0, authMiddleware_1.authorize)('merchant'));
router.route('/').get(orderController_1.getOrders).post(orderController_1.createOrder);
router.get('/stats', orderController_1.getOrderStats);
router.route('/:id').get(orderController_1.getOrderById);
router.route('/:id/status').put(orderController_1.updateOrderStatus);
router.route('/:id/notes').post(orderController_1.addMerchantNote);
exports.default = router;
