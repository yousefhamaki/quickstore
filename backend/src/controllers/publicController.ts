import { Request, Response } from 'express';
import Store from '../models/Store';
import Product from '../models/Product';
import Coupon from '../models/Coupon';
import { redisClient } from '../config/redis';

// @desc    Get store by subdomain
// @route   GET /api/public/stores/:subdomain
// @access  Public
export const getStoreBySubdomain = async (req: Request, res: Response) => {
    try {
        const { subdomain } = req.params;
        const cacheKey = `store_customization:${subdomain}`;
        
        let cachedStore = null;
        try {
            cachedStore = await redisClient.get(cacheKey);
        } catch (redisErr) {
            console.warn(`[Redis Fallback] GET failed for ${cacheKey}`, redisErr);
        }

        if (cachedStore) {
            return res.json(JSON.parse(cachedStore));
        }

        const store = await Store.findOne({ 'domain.subdomain': subdomain, status: 'live' }).lean(); // Huge performance hydration bypass

        if (!store) {
            return res.status(404).json({ message: 'Store not found or not published' });
        }

        // Cache settings in redis for 1 hour to prevent DB spikes from viral stores
        try {
            await redisClient.setex(cacheKey, 3600, JSON.stringify(store));
        } catch (redisErr) {
            console.warn(`[Redis Fallback] SET failed for ${cacheKey}`, redisErr);
        }

        res.json(store);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

/**
 * @desc    Track store visit (Increment visitor count)
 * @route   POST /api/public/stores/:storeId/visit
 */
export const trackStoreVisit = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.params;
        await Store.findByIdAndUpdate(storeId, { $inc: { 'stats.totalVisitors': 1 } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Error tracking visit', error });
    }
};

// @desc    Get products for a store
// @route   GET /api/public/stores/:storeId/products
// @access  Public
export const getStoreProducts = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.params;
        const cacheKey = `products:store:${storeId}:public:list`;
        
        let cachedData = null;
        try {
            cachedData = await redisClient.get(cacheKey);
        } catch (redisErr) {
            console.warn(`[Redis Fallback] GET failed for ${cacheKey}`, redisErr);
        }

        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        const products = await Product.find({ storeId, status: 'active' }).sort({ createdAt: -1 });

        try {
            await redisClient.setex(cacheKey, 1800, JSON.stringify(products)); // 30 min cache
        } catch (redisErr) {
            console.warn(`[Redis Fallback] SET failed for ${cacheKey}`, redisErr);
        }

        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

// @desc    Get single product details
// @route   GET /api/public/products/:productId
// @access  Public
export const getProductDetails = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        const cacheKey = `product:${productId}`;
        
        let cachedProduct = null;
        try {
            cachedProduct = await redisClient.get(cacheKey);
        } catch (redisErr) {
            console.warn(`[Redis Fallback] GET failed for ${cacheKey}`);
        }

        if (cachedProduct) {
            return res.json(JSON.parse(cachedProduct));
        }

        const product = await Product.findOne({ _id: productId, status: 'active' });

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        try {
            await redisClient.setex(cacheKey, 3600, JSON.stringify(product)); // 1 hour cache
        } catch (redisErr) {
            console.warn(`[Redis Fallback] SET failed for ${cacheKey}`);
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
};

/**
 * @desc    Validate coupon code for a store
 * @route   GET /api/public/stores/:storeId/coupons/validate?code=...
 */
export const validateCoupon = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.params;
        const { code, subtotal } = req.query;

        if (!code) {
            return res.status(400).json({ success: false, message: 'Coupon code is required' });
        }

        const coupon = await Coupon.findOne({
            storeId,
            code: (code as string).toUpperCase(),
            isActive: true
        });

        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Invalid or inactive coupon code' });
        }

        // Check Minimum Order Amount
        if (coupon.minOrderAmount && subtotal && Number(subtotal) < coupon.minOrderAmount) {
            return res.status(400).json({
                success: false,
                code: 'MIN_ORDER_AMOUNT',
                message: `This coupon requires a minimum order of EGP ${coupon.minOrderAmount}`,
                minOrderAmount: coupon.minOrderAmount
            });
        }

        // Check expiry
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
            return res.status(400).json({ success: false, message: 'This coupon has expired' });
        }

        // Check usage limit
        if (coupon.maxUsage !== -1 && coupon.usageCount >= coupon.maxUsage) {
            return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit' });
        }

        res.json({
            success: true,
            coupon: {
                _id: coupon._id,
                code: coupon.code,
                type: coupon.type,
                value: coupon.value
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error validating coupon', error });
    }
};
