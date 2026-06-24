import { Request, Response } from 'express';
import Store from '../models/Store';
import Product from '../models/Product';
import Coupon from '../models/Coupon';
import Customer from '../models/Customer';
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

        const store = await Store.findOne({
            $or: [
                { 'domain.subdomain': subdomain },
                { 'domain.customDomain': subdomain }
            ],
            status: 'live'
        }).lean(); // Huge performance hydration bypass

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

// @desc    Subscribe to storefront newsletter (Idempotent Flow)
// @route   POST /api/public/stores/:storeId/newsletter/subscribe
// @access  Public
export const subscribeNewsletter = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.params;
        const { email, source, consentText, honeypot } = req.body;

        // 1. Bot Honeypot mitigation
        if (honeypot) {
            console.log(`[Newsletter] Bot trap triggered by honeypot submission.`);
            return res.json({ success: true, message: 'Subscribed successfully' });
        }

        // 2. Validate email input
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ success: false, message: 'Email address is required' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 3. Verify store existence and active status
        const store = await Store.findOne({ _id: storeId, status: 'live' });
        if (!store) {
            return res.status(404).json({ success: false, message: 'Store not found or unavailable' });
        }

        // 4. Find or update/create unified contact record
        let customer = await Customer.findOne({ storeId, email: normalizedEmail });

        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        const textConsent = consentText || 'I agree to receive store newsletter updates.';

        if (!customer) {
            // First time signup
            customer = new Customer({
                storeId,
                email: normalizedEmail,
                consentStatus: 'subscribed',
                source: source || 'storefront_footer',
                consentHistory: [{
                    status: 'subscribed',
                    action: 'opt_in_signup',
                    timestamp: new Date(),
                    ipAddress,
                    userAgent,
                    consentText: textConsent
                }]
            });
            await customer.save();
        } else {
            // Already exists in DB
            if (customer.consentStatus === 'subscribed') {
                return res.json({ success: true, message: 'Subscribed successfully' });
            }

            // Update status and push audit log
            customer.consentStatus = 'subscribed';
            customer.consentHistory.push({
                status: 'subscribed',
                action: 'opt_in_resubscribe',
                timestamp: new Date(),
                ipAddress,
                userAgent,
                consentText: textConsent
            });
            await customer.save();
        }

        res.json({ success: true, message: 'Subscribed successfully' });
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        res.status(500).json({ success: false, message: 'Server Error', error });
    }
};
