import { Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import Customer from '../models/Customer';
import Store from '../models/Store';
import { AuthRequest, resolveStore } from '../middleware/authMiddleware';

// @desc    Get dashboard overview analytics
// @route   GET /api/analytics/overview
// @access  Private/Merchant
export const getOverview = async (req: AuthRequest, res: Response) => {
    try {
        const store = await resolveStore(req);
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

        // Gross Profit / Margin — derived from each order item's
        // costAtPurchase snapshot (see Order.ts IOrderItem.costAtPurchase),
        // NOT from the product's current costPerItem, so editing a
        // product's cost later never rewrites past profit history.
        //
        // Orders placed before this field existed (or line items on a
        // product that had no costPerItem set) have costAtPurchase ===
        // null/undefined. We treat that as "no known cost" and contribute
        // $0 to the cost side of the sum via $ifNull, rather than either
        // (a) crashing, or (b) assuming a cost equal to the sale price
        // (which would silently zero out profit for perfectly normal
        // orders). We chose this over excluding such orders' revenue
        // entirely because revenue is still real and known — only the cost
        // is unknown. The tradeoff: Gross Profit/Margin will read as
        // OVERSTATED for any store with pre-migration orders or products
        // that never had a cost price entered, since those items' real
        // (unknown) cost is treated as zero rather than average/estimated.
        const profitStats = await Order.aggregate([
            {
                $match: {
                    storeId: store._id,
                    status: { $nin: ['cancelled', 'refunded'] },
                    paymentStatus: { $ne: 'failed' }
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: null,
                    totalCost: {
                        $sum: {
                            $multiply: [
                                { $ifNull: ['$items.costAtPurchase', 0] },
                                '$items.quantity'
                            ]
                        }
                    }
                }
            }
        ]);
        const totalCost = profitStats.length > 0 ? profitStats[0].totalCost : 0;
        const grossProfit = Number((totalRevenue - totalCost).toFixed(2));
        const marginPercent = totalRevenue > 0 ? Number(((grossProfit / totalRevenue) * 100).toFixed(2)) : 0;

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
            grossProfit,
            marginPercent,
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
        const store = await resolveStore(req);
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
        const store = await resolveStore(req);
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
                    // See getOverview's grossProfit comment: missing/null
                    // costAtPurchase (pre-migration orders, or a product with
                    // no cost price set) contributes $0 cost via $ifNull, so
                    // profit here is a floor, not an exact historical figure.
                    cost: {
                        $sum: {
                            $multiply: [
                                { $ifNull: ['$items.costAtPurchase', 0] },
                                '$items.quantity'
                            ]
                        }
                    },
                    productName: { $first: '$items.name' },
                    productImage: { $first: '$items.image' }
                }
            },
            {
                $addFields: {
                    profit: { $subtract: ['$revenue', '$cost'] }
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
        const store = await resolveStore(req);
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
        const store = await resolveStore(req);
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
