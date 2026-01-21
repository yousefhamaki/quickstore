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
exports.getCustomerStats = exports.getRecentOrders = exports.getTopProducts = exports.getRevenueChart = exports.getOverview = void 0;
const Order_1 = __importDefault(require("../models/Order"));
const Product_1 = __importDefault(require("../models/Product"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Store_1 = __importDefault(require("../models/Store"));
// @desc    Get dashboard overview analytics
// @route   GET /api/analytics/overview
// @access  Private/Merchant
const getOverview = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        // Get date range (default: last 30 days)
        const days = parseInt(req.query.days) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        // Total orders
        const totalOrders = yield Order_1.default.countDocuments({ storeId: store._id });
        const recentOrders = yield Order_1.default.countDocuments({
            storeId: store._id,
            createdAt: { $gte: startDate }
        });
        // Total revenue
        const revenueResult = yield Order_1.default.aggregate([
            { $match: { storeId: store._id, paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
        // Recent revenue
        const recentRevenueResult = yield Order_1.default.aggregate([
            {
                $match: {
                    storeId: store._id,
                    paymentStatus: 'paid',
                    createdAt: { $gte: startDate }
                }
            },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const recentRevenue = recentRevenueResult.length > 0 ? recentRevenueResult[0].total : 0;
        // Total customers
        const totalCustomers = yield Customer_1.default.countDocuments({ storeId: store._id });
        const recentCustomers = yield Customer_1.default.countDocuments({
            storeId: store._id,
            createdAt: { $gte: startDate }
        });
        // Total products
        const totalProducts = yield Product_1.default.countDocuments({ storeId: store._id, status: 'active' });
        // Low stock products
        const lowStockProducts = yield Product_1.default.countDocuments({
            storeId: store._id,
            status: 'active',
            trackInventory: true,
            $expr: { $lte: ['$inventory.quantity', '$inventory.lowStockThreshold'] }
        });
        res.json({
            totalOrders,
            recentOrders,
            totalRevenue,
            recentRevenue,
            totalCustomers,
            recentCustomers,
            totalProducts,
            lowStockProducts
        });
    }
    catch (error) {
        console.error('Analytics Overview Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getOverview = getOverview;
// @desc    Get revenue chart data
// @route   GET /api/analytics/revenue?period=daily|weekly|monthly
// @access  Private/Merchant
const getRevenueChart = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const period = req.query.period || 'daily';
        let groupBy;
        let days = 30;
        if (period === 'daily') {
            groupBy = {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
            };
            days = 30;
        }
        else if (period === 'weekly') {
            groupBy = {
                year: { $year: '$createdAt' },
                week: { $week: '$createdAt' }
            };
            days = 90;
        }
        else {
            groupBy = {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
            };
            days = 365;
        }
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const revenueData = yield Order_1.default.aggregate([
            {
                $match: {
                    storeId: store._id,
                    paymentStatus: 'paid',
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: groupBy,
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.week': 1 } }
        ]);
        res.json(revenueData);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getRevenueChart = getRevenueChart;
// @desc    Get top selling products
// @route   GET /api/analytics/top-products?limit=5
// @access  Private/Merchant
const getTopProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const limit = parseInt(req.query.limit) || 5;
        const topProducts = yield Order_1.default.aggregate([
            { $match: { storeId: store._id } },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productId',
                    totalSold: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
                    productName: { $first: '$items.name' },
                    productImage: { $first: '$items.image' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: limit }
        ]);
        res.json(topProducts);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getTopProducts = getTopProducts;
// @desc    Get recent orders
// @route   GET /api/analytics/recent-orders?limit=10
// @access  Private/Merchant
const getRecentOrders = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const limit = parseInt(req.query.limit) || 10;
        const recentOrders = yield Order_1.default.find({ storeId: store._id })
            .populate('customerId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('orderNumber total status paymentStatus createdAt');
        res.json(recentOrders);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getRecentOrders = getRecentOrders;
// @desc    Get customer growth stats
// @route   GET /api/analytics/customers
// @access  Private/Merchant
const getCustomerStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const store = yield Store_1.default.findOne({ merchantId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }
        const totalCustomers = yield Customer_1.default.countDocuments({ storeId: store._id });
        // Customers by month (last 12 months)
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 12);
        const customerGrowth = yield Customer_1.default.aggregate([
            {
                $match: {
                    storeId: store._id,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);
        res.json({
            totalCustomers,
            growth: customerGrowth
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});
exports.getCustomerStats = getCustomerStats;
