"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const Product_1 = __importDefault(require("../models/Product"));
const InventoryLog_1 = __importDefault(require("../models/InventoryLog"));
const mongoose_1 = __importDefault(require("mongoose"));
// @desc    Get all orders for a store
// @route   GET /api/orders
// @access  Private/Merchant
const getOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        const { storeId, status, search, pageNumber } = req.query;
        let query = {};
        if (storeId) {
            // Verify store belongs to merchant
            const store = yield Store_1.default.findOne({ _id: storeId, ownerId: userId });
            if (!store) {
                return res.status(404).json({ message: 'Store not found or unauthorized' });
            }
            query.storeId = storeId;
        }
        else {
            // Get all stores owned by merchant
            const stores = yield Store_1.default.find({ ownerId: userId });
            const storeIds = stores.map(store => store._id);
            query.storeId = { $in: storeIds };
        }
        const pageSize = 20;
        const page = Number(pageNumber) || 1;
        if (status) {
            query.status = status;
        }
        if (search) {
            query.orderNumber = { $regex: search, $options: 'i' };
        }
        const count = yield Order_1.default.countDocuments(query);
        const orders = yield Order_1.default.find(query)
            .populate('customerId', 'firstName lastName email')
            .populate('storeId', 'name')
            .sort({ createdAt: -1 })
            .limit(pageSize)
            .skip(pageSize * (page - 1));
        res.json({ orders, page, pages: Math.ceil(count / pageSize) });
    }
    catch (error) {
        console.error('Get Orders Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getOrders = getOrders;
// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private/Merchant
const getOrderById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ ownerId: req.user._id });
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
    let session = null;
    try {
        const store = yield Store_1.default.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const { status } = req.body;
        const oldStatus = req.body.oldStatus; // Frontend should ideally pass this, or we fetch it.
        // Start transaction
        session = yield mongoose_1.default.startSession();
        session.startTransaction();
        const order = yield Order_1.default.findOne({ _id: req.params.id, storeId: store._id }).session(session);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const previousStatus = order.status;
        order.status = status;
        order.timeline.push({
            status,
            timestamp: new Date(),
            note: `Status updated to ${status} by merchant`
        });
        // Inventory Logic based on status transition
        if (previousStatus === 'pending' && status !== 'pending') {
            // Moving out of pending
            if (['cancelled', 'refunded'].includes(status)) {
                // RELEASE Reservation
                for (const item of order.items) {
                    const product = yield Product_1.default.findById(item.productId).session(session);
                    if (product && product.trackInventory) {
                        const updateQuery = item.variantId
                            ? { "variants._id": item.variantId }
                            : {};
                        const updateAction = item.variantId
                            ? { "variants.$.reserved": -item.quantity, "inventory.reserved": -item.quantity }
                            : { "inventory.reserved": -item.quantity };
                        const updatedProduct = yield Product_1.default.findOneAndUpdate(Object.assign({ _id: item.productId }, updateQuery), { $inc: updateAction }, { session, new: true });
                        if (updatedProduct) {
                            const variant = item.variantId
                                ? updatedProduct.variants.find((v) => { var _a; return v._id.toString() === ((_a = item.variantId) === null || _a === void 0 ? void 0 : _a.toString()); })
                                : null;
                            const calculatedPrevBalance = item.variantId
                                ? ((variant === null || variant === void 0 ? void 0 : variant.inventory) || 0) - (((variant === null || variant === void 0 ? void 0 : variant.reserved) || 0) + item.quantity)
                                : (updatedProduct.inventory.quantity || 0) - ((updatedProduct.inventory.reserved || 0) + item.quantity);
                            const calculatedNewBalance = item.variantId
                                ? ((variant === null || variant === void 0 ? void 0 : variant.inventory) || 0) - ((variant === null || variant === void 0 ? void 0 : variant.reserved) || 0)
                                : (updatedProduct.inventory.quantity || 0) - (updatedProduct.inventory.reserved || 0);
                            yield InventoryLog_1.default.create([{
                                    storeId: store._id,
                                    productId: item.productId,
                                    variantId: item.variantId,
                                    orderId: order._id,
                                    type: 'RELEASE',
                                    amount: item.quantity,
                                    previousBalance: calculatedPrevBalance,
                                    newBalance: calculatedNewBalance,
                                    reason: `Order #${order.orderNumber} ${status} - stock released`
                                }], { session });
                            // -- CACHE INVALIDATION (Refund/Cancel Sync) --
                            try {
                                const { redisClient } = yield Promise.resolve().then(() => __importStar(require('../config/redis')));
                                const { clearStoreProductCaches } = yield Promise.resolve().then(() => __importStar(require('./productController')));
                                yield redisClient.unlink(`product:${item.productId}`);
                                // CACHE THRASHING PROTECTION: Only wipe the store list cache if stock goes from 0 back to >0 (Item Back in Stock)
                                if (calculatedPrevBalance === 0 && calculatedNewBalance > 0) {
                                    yield clearStoreProductCaches(store._id.toString());
                                }
                            }
                            catch (e) {
                                console.warn('Refund cache wipe failed:', e);
                            }
                        }
                    }
                }
            }
            else if (['processing', 'shipped', 'delivered'].includes(status)) {
                // CAPTURE Reservation (Deduct inventory AND reserved)
                for (const item of order.items) {
                    const product = yield Product_1.default.findById(item.productId).session(session);
                    if (product && product.trackInventory) {
                        const updateQuery = item.variantId
                            ? { "variants._id": item.variantId }
                            : {};
                        const updateAction = item.variantId
                            ? {
                                "variants.$.inventory": -item.quantity,
                                "variants.$.reserved": -item.quantity,
                                "inventory.quantity": -item.quantity,
                                "inventory.reserved": -item.quantity
                            }
                            : {
                                "inventory.quantity": -item.quantity,
                                "inventory.reserved": -item.quantity
                            };
                        const updatedProduct = yield Product_1.default.findOneAndUpdate(Object.assign({ _id: item.productId }, updateQuery), { $inc: updateAction }, { session, new: true });
                        if (updatedProduct) {
                            const variant = item.variantId
                                ? updatedProduct.variants.find((v) => { var _a; return v._id.toString() === ((_a = item.variantId) === null || _a === void 0 ? void 0 : _a.toString()); })
                                : null;
                            yield InventoryLog_1.default.create([{
                                    storeId: store._id,
                                    productId: item.productId,
                                    variantId: item.variantId,
                                    orderId: order._id,
                                    type: 'SALE',
                                    amount: item.quantity,
                                    previousBalance: item.variantId
                                        ? ((variant === null || variant === void 0 ? void 0 : variant.inventory) || 0 + item.quantity) - ((variant === null || variant === void 0 ? void 0 : variant.reserved) || 0 + item.quantity)
                                        : (updatedProduct.inventory.quantity || 0 + item.quantity) - (updatedProduct.inventory.reserved || 0 + item.quantity),
                                    newBalance: item.variantId
                                        ? ((variant === null || variant === void 0 ? void 0 : variant.inventory) || 0) - ((variant === null || variant === void 0 ? void 0 : variant.reserved) || 0)
                                        : (updatedProduct.inventory.quantity || 0) - (updatedProduct.inventory.reserved || 0),
                                    reason: `Order #${order.orderNumber} ${status} - stock captured`
                                }], { session });
                        }
                    }
                }
            }
        }
        const updatedOrder = yield order.save({ session });
        yield session.commitTransaction();
        res.json(updatedOrder);
    }
    catch (error) {
        if (session)
            yield session.abortTransaction();
        console.error('Update Order Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
    finally {
        if (session)
            session.endSession();
    }
});
exports.updateOrderStatus = updateOrderStatus;
// @desc    Create new order (Merchant Manual Creation or Testing)
// @route   POST /api/orders
// @access  Private/Merchant
const createOrder = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { storeId, customerId, items, subtotal, shipping, tax, discount, total, paymentMethod, shippingAddress, billingAddress, customerNote } = req.body;
        const store = yield Store_1.default.findOne({ _id: storeId, ownerId: req.user._id }).populate({
            path: 'subscriptionId',
            populate: { path: 'planId' }
        });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        // Calculate transaction fee based on plan
        const plan = (_a = store.subscriptionId) === null || _a === void 0 ? void 0 : _a.planId;
        const feePercent = (plan === null || plan === void 0 ? void 0 : plan.transactionFeePercent) || 0;
        const transactionFee = Number((total * (feePercent / 100)).toFixed(2));
        // Generate Order Number
        const count = yield Order_1.default.countDocuments({ storeId: store._id });
        const orderNumber = `#QS-${1000 + count + 1}`;
        const order = yield Order_1.default.create({
            storeId: store._id,
            customerId,
            orderNumber,
            items,
            subtotal,
            shipping,
            tax,
            discount,
            total,
            transactionFee, // Track platform fee
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
        // Update Store Stats
        store.stats.totalOrders += 1;
        store.stats.totalRevenue += total;
        yield store.save();
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
        const store = yield Store_1.default.findOne({ ownerId: req.user._id });
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
        const store = yield Store_1.default.findOne({ ownerId: req.user._id });
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
