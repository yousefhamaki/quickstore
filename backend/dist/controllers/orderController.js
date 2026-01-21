"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrderStats = exports.addMerchantNote = exports.createOrder = exports.updateOrderStatus = exports.getOrderById = exports.getOrders = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const Store_1 = __importDefault(require("../models/Store"));
// @desc    Get all orders for a store
// @route   GET /api/orders
// @access  Private/Merchant
const getOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const pageSize = 20;
        const page = Number(req.query.pageNumber) || 1;
        // Build filter query
        const query = { storeId: store._id };
        if (req.query.status) {
            query.status = req.query.status;
        }
        if (req.query.search) {
            query.orderNumber = { $regex: req.query.search, $options: 'i' };
            // Could extend to search customer name if populated or by aggregations
        }
        const count = yield Order_1.default.countDocuments(query);
        const orders = yield Order_1.default.find(query)
            .populate('customerId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));
        res.json({ orders, page, pages: Math.ceil(count / pageSize) });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getOrders = getOrders;
// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private/Merchant
const getOrderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const order = yield Order_1.default.findOne({ _id: req.params.id, storeId: store._id })
            .populate('customerId', 'firstName lastName email phone')
            .populate('items.productId', 'name images');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getOrderById = getOrderById;
// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Merchant
const updateOrderStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const { status } = req.body;
        const order = yield Order_1.default.findOne({ _id: req.params.id, storeId: store._id });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        order.status = status;
        order.timeline.push({
            status,
            timestamp: new Date(),
            note: `Status updated to ${status} by merchant`
        });
        const updatedOrder = yield order.save();
        res.json(updatedOrder);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.updateOrderStatus = updateOrderStatus;
// @desc    Create new order (Merchant Manual Creation or Testing)
// @route   POST /api/orders
// @access  Private/Merchant
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        // Generate Order Number
        const count = yield Order_1.default.countDocuments({ storeId: store._id });
        const orderNumber = `#QS-${1000 + count + 1}`;
        const { customerId, items, subtotal, shipping, tax, discount, total, paymentMethod, shippingAddress, billingAddress, customerNote } = req.body;
        const order = yield Order_1.default.create({
            storeId: store._id,
            customerId, // Should be an existing customer ID or created beforehand
            orderNumber,
            items,
            subtotal,
            shipping,
            tax,
            discount,
            total,
            paymentMethod,
            shippingAddress,
            billingAddress,
            customerNote,
            timeline: [{
                    status: 'pending',
                    timestamp: new Date(),
                    note: 'Order created'
                }]
        });
        res.status(201).json(order);
    }
    catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.createOrder = createOrder;
// @desc    Add merchant note to order
// @route   POST /api/orders/:id/notes
// @access  Private/Merchant
const addMerchantNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const { note } = req.body;
        const order = yield Order_1.default.findOne({ _id: req.params.id, storeId: store._id });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        order.merchantNote = note;
        yield order.save();
        res.json({ message: 'Note added successfully', order });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.addMerchantNote = addMerchantNote;
// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private/Merchant
const getOrderStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const totalOrders = yield Order_1.default.countDocuments({ storeId: store._id });
        const pendingOrders = yield Order_1.default.countDocuments({ storeId: store._id, status: 'pending' });
        const processingOrders = yield Order_1.default.countDocuments({ storeId: store._id, status: 'processing' });
        const shippedOrders = yield Order_1.default.countDocuments({ storeId: store._id, status: 'shipped' });
        const deliveredOrders = yield Order_1.default.countDocuments({ storeId: store._id, status: 'delivered' });
        // Calculate total revenue
        const revenueResult = yield Order_1.default.aggregate([
            { $match: { storeId: store._id, paymentStatus: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
        res.json({
            totalOrders,
            pendingOrders,
            processingOrders,
            shippedOrders,
            deliveredOrders,
            totalRevenue
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getOrderStats = getOrderStats;
