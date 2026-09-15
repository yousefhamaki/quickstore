import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Review from '../models/Review';
import Order from '../models/Order';
import Customer from '../models/Customer';
import Product from '../models/Product';
import { AuthRequest, resolveStore } from '../middleware/authMiddleware';
import { redisClient } from '../config/redis';
import { clearStoreProductCaches } from './productController';
import { createNotification } from '../services/notificationService';
import Store from '../models/Store';

/**
 * Recomputes a product's denormalized rating fields from its APPROVED
 * reviews. Called after any moderation action (approve/reject/delete)
 * rather than incrementally adjusted, so a bug in one code path can't leave
 * the average silently wrong forever — it's always a fresh aggregate.
 *
 * Also busts the product's own Redis cache (getProductDetails/getProductById
 * both cache under `product:<id>` for up to an hour) plus the store-wide
 * product-list caches — without this, a merchant approving a review would
 * not see the new rating reflected on the storefront until the cache
 * naturally expired.
 */
export const recomputeProductRating = async (productId: any) => {
    const [agg] = await Review.aggregate([
        { $match: { productId: productId, status: 'approved' } },
        { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const product = await Product.findByIdAndUpdate(productId, {
        ratingAverage: agg ? Math.round(agg.average * 10) / 10 : 0,
        ratingCount: agg ? agg.count : 0
    }, { new: true });

    if (product) {
        try {
            await redisClient.del(`product:${productId}`);
        } catch (err) {
            console.warn(`[Redis Fallback] DEL failed for product:${productId}`, err);
        }
        await clearStoreProductCaches(product.storeId.toString());
    }
};

const displayName = (firstName?: string, lastName?: string) => {
    const first = firstName?.trim();
    const lastInitial = lastName?.trim()?.[0];
    if (first && lastInitial) return `${first} ${lastInitial}.`;
    if (first) return first;
    return 'Verified Buyer';
};

// @desc    List approved reviews for a product (storefront)
// @route   GET /api/public/products/:productId/reviews
// @access  Public
export const getProductReviews = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, parseInt(req.query.limit as string) || 10);

        const filter = { productId, status: 'approved' };
        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .select('customerName rating title comment merchantReply createdAt')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Review.countDocuments(filter)
        ]);

        res.json({ reviews, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// If the request carries a valid logged-in-customer Bearer token (see
// customerAuthMiddleware) scoped to this exact store, returns that
// Customer doc — otherwise null. Deliberately tolerant of a
// missing/invalid/foreign-store token (returns null rather than
// throwing) since review submission still works for guests via the
// orderNumber+email path below; this is purely a nicer path for anyone
// who happens to be logged in.
const getLoggedInCustomer = async (req: Request, storeId: string) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ') || !storeId) return null;
    try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET as string) as any;
        if (decoded.role !== 'customer' || decoded.storeId !== storeId) return null;
        return await Customer.findById(decoded.id);
    } catch {
        return null;
    }
};

// @desc    Submit a review for a product — must come from a real delivered
//          order for that exact product. A logged-in customer (see
//          customerAuthController) is verified directly against their own
//          order history; a guest instead matches by order number + email,
//          the strongest verification available without an account.
// @route   POST /api/public/products/:productId/reviews
// @access  Public (rate-limited — see reviewRoutes.ts)
export const createReview = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const { storeId, orderNumber, email, rating, title, comment } = req.body;

        if (!storeId) {
            return res.status(400).json({ message: 'storeId is required' });
        }
        const numericRating = Number(rating);
        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
            return res.status(400).json({ message: 'rating must be an integer from 1 to 5' });
        }
        if (!comment?.trim()) {
            return res.status(400).json({ message: 'A comment is required' });
        }

        let order;
        let customer;

        const loggedInCustomer = await getLoggedInCustomer(req, storeId);
        if (loggedInCustomer) {
            customer = loggedInCustomer;
            order = await Order.findOne({
                storeId,
                customerId: loggedInCustomer._id,
                status: 'delivered',
                'items.productId': productId
            });
            if (!order) {
                return res.status(403).json({ message: "We couldn't find a delivered order of this product on your account." });
            }
        } else {
            if (!orderNumber || !email) {
                return res.status(400).json({ message: 'orderNumber and email are required' });
            }

            order = await Order.findOne({ storeId, orderNumber: orderNumber.trim().toUpperCase(), status: 'delivered' })
                .populate('customerId', 'email firstName lastName');
            if (!order) {
                return res.status(404).json({ message: 'No delivered order found with that order number for this store.' });
            }

            customer = order.customerId as any;
            if (!customer || customer.email?.toLowerCase() !== email.trim().toLowerCase()) {
                return res.status(403).json({ message: "That email doesn't match the order." });
            }

            const purchasedThisProduct = order.items.some((item: any) => item.productId?.toString() === productId);
            if (!purchasedThisProduct) {
                return res.status(403).json({ message: 'This product was not part of that order.' });
            }
        }

        let review;
        try {
            review = await Review.create({
                storeId,
                productId,
                orderId: order._id,
                customerId: customer._id,
                customerName: displayName(customer.firstName, customer.lastName),
                rating: numericRating,
                title: title?.trim(),
                comment: comment.trim(),
                status: 'pending'
            });
        } catch (err: any) {
            if (err.code === 11000) {
                return res.status(409).json({ message: 'You already reviewed this product for this order.' });
            }
            throw err;
        }

        const store = await Store.findById(storeId).select('ownerId');
        if (store) {
            createNotification({
                userId: store.ownerId.toString(),
                storeId,
                type: 'review_submitted',
                title: 'New review submitted',
                message: `${numericRating}★ review awaiting moderation.`,
                link: `/dashboard/stores/${storeId}/reviews`,
            }).catch(() => {});
        }

        res.status(201).json({
            message: 'Thanks! Your review will appear once it\'s been checked by the store.',
            review: { _id: review._id, status: review.status }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    List reviews for merchant moderation
// @route   GET /api/reviews
// @access  Private/Merchant
export const getMerchantReviews = async (req: AuthRequest, res: Response) => {
    try {
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const filter: any = { storeId: store._id };
        if (req.query.status) filter.status = req.query.status;
        if (req.query.productId) filter.productId = req.query.productId;

        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

        const [reviews, total] = await Promise.all([
            Review.find(filter)
                .populate('productId', 'name images')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Review.countDocuments(filter)
        ]);

        res.json({ reviews, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Approve or reject a review
// @route   PUT /api/reviews/:id/status
// @access  Private/Merchant
export const updateReviewStatus = async (req: AuthRequest, res: Response) => {
    try {
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const { status } = req.body;
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });
        }

        const review = await Review.findOne({ _id: req.params.id, storeId: store._id });
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        review.status = status;
        await review.save();
        await recomputeProductRating(review.productId);

        res.json(review);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Reply to a review (shown publicly under it)
// @route   POST /api/reviews/:id/reply
// @access  Private/Merchant
export const replyToReview = async (req: AuthRequest, res: Response) => {
    try {
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const { message } = req.body;
        if (!message?.trim()) {
            return res.status(400).json({ message: 'A reply message is required' });
        }

        const review = await Review.findOneAndUpdate(
            { _id: req.params.id, storeId: store._id },
            { $set: { merchantReply: { message: message.trim(), repliedAt: new Date() } } },
            { new: true }
        );
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        res.json(review);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Delete a review (e.g. abusive content)
// @route   DELETE /api/reviews/:id
// @access  Private/Merchant
export const deleteReview = async (req: AuthRequest, res: Response) => {
    try {
        const store = await resolveStore(req);
        if (!store) {
            return res.status(404).json({ message: 'Store not found' });
        }

        const review = await Review.findOneAndDelete({ _id: req.params.id, storeId: store._id });
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        if (review.status === 'approved') {
            await recomputeProductRating(review.productId);
        }

        res.json({ message: 'Review deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};
