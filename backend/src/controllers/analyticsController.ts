import { Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import Customer from '../models/Customer';
import Store from '../models/Store';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Get dashboard overview analytics
// @route   GET /api/analytics/overview
// @access  Private/Merchant
export const getOverview = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        // Get date range (default: last 30 days)
        const days = parseInt(req.query.days as string) || 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Total orders
        const totalOrders = await Order.countDocuments({ storeId: store._id });
        const recentOrders = await Order.countDocuments({
            storeId: store._id,
            createdAt: { $gte: startDate }
        });

        // Revenue breakdown
        const revenueStats = await Order.aggregate([
            {
                $match: {
                    storeId: store._id,
                    status: { $nin: ['cancelled', 'refunded'] },
                    paymentStatus: { $ne: 'failed' }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$total' },
                    completed: {
                        $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0] }
                    },
                    pending: {
                        $sum: { $cond: [{ $ne: ['$status', 'delivered'] }, '$total', 0] }
                    }
                }
            }
        ]);

        const totalRevenue = revenueStats.length > 0 ? revenueStats[0].total : 0;
        const completedRevenue = revenueStats.length > 0 ? revenueStats[0].completed : 0;
        const pendingRevenue = revenueStats.length > 0 ? revenueStats[0].pending : 0;

        // Recent revenue
        const recentRevenueResult = await Order.aggregate([
            {
                $match: {
                    storeId: store._id,
                    status: { $nin: ['cancelled', 'refunded'] },
                    paymentStatus: { $ne: 'failed' },
                    createdAt: { $gte: startDate }
                }
            },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const recentRevenue = recentRevenueResult.length > 0 ? recentRevenueResult[0].total : 0;

        // Total customers
        const totalCustomers = await Customer.countDocuments({ storeId: store._id });
        const recentCustomers = await Customer.countDocuments({
            storeId: store._id,
            createdAt: { $gte: startDate }
        });

        // Total products
        const totalProducts = await Product.countDocuments({ storeId: store._id, status: 'active' });

        // Low stock products
        const lowStockProducts = await Product.countDocuments({
            storeId: store._id,
            status: 'active',
            trackInventory: true,
            $expr: { $lte: ['$inventory.quantity', '$inventory.lowStockThreshold'] }
        });

        const totalVisitors = store.stats?.totalVisitors || 0;
        const conversion = totalVisitors > 0 ? (totalOrders / totalVisitors) * 100 : 0;

        res.json({
            totalOrders,
            recentOrders,
            totalRevenue,
            completedRevenue,
            pendingRevenue,
            recentRevenue,
            totalCustomers,
            recentCustomers,
            totalProducts,
            lowStockProducts,
            totalVisitors,
            conversion
        });
    } catch (error) {
        console.error('Analytics Overview Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get revenue chart data
// @route   GET /api/analytics/revenue?period=daily|weekly|monthly
// @access  Private/Merchant
export const getRevenueChart = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const period = req.query.period || 'daily';
        let groupBy: any;
        let days = 30;

        if (period === 'daily') {
            groupBy = {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
            };
            days = 30;
        } else if (period === 'weekly') {
            groupBy = {
                year: { $year: '$createdAt' },
                week: { $week: '$createdAt' }
            };
            days = 90;
        } else {
            groupBy = {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
            };
            days = 365;
        }

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const revenueData = await Order.aggregate([
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
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get top selling products
// @route   GET /api/analytics/top-products?limit=5
// @access  Private/Merchant
export const getTopProducts = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const limit = parseInt(req.query.limit as string) || 5;

        const topProducts = await Order.aggregate([
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
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get recent orders
// @route   GET /api/analytics/recent-orders?limit=10
// @access  Private/Merchant
export const getRecentOrders = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const limit = parseInt(req.query.limit as string) || 10;

        const recentOrders = await Order.find({ storeId: store._id })
            .populate('customerId', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('orderNumber total status paymentStatus createdAt');

        res.json(recentOrders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get customer growth stats
// @route   GET /api/analytics/customers
// @access  Private/Merchant
export const getCustomerStats = async (req: AuthRequest, res: Response) => {
    try {
        const store = await Store.findOne({ ownerId: req.user._id });
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const totalCustomers = await Customer.countDocuments({ storeId: store._id });

        // Customers by month (last 12 months)
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 12);

        const customerGrowth = await Customer.aggregate([
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
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};
