import { Request, Response } from 'express';
import Store from '../models/Store';
import Product from '../models/Product';
import Category from '../models/Category';
import Coupon from '../models/Coupon';
import Customer from '../models/Customer';
import Subscription from '../models/Subscription';
import { redisClient } from '../config/redis';
import { withStockVirtuals, withStockVirtualsMany } from '../utils/productStock';

/**
 * Hero slider is admin-controlled per subscription plan (see
 * storeController.updateStore, which enforces this on save). Applied at
 * RESPONSE time — not baked into what gets cached — so that toggling a
 * plan's access in the admin dashboard takes effect on the very next
 * request instead of waiting up to the cache's 1-hour TTL either way
 * (revoking hides slides immediately; re-granting un-hides them
 * immediately too, with nothing to re-save or invalidate).
 */
async function gateHeroSlider(store: any) {
    if (!store?.theme?.customizations?.heroSlider) return store;
    const subscription = await Subscription.findOne({ userId: store.ownerId }).populate('planId').lean();
    const plan = (subscription as any)?.planId;
    if (!plan?.features?.allowHeroSlider) {
        delete store.theme.customizations.heroSlider;
    }
    return store;
}

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
            return res.json(await gateHeroSlider(JSON.parse(cachedStore)));
        }

        // Custom-domain matches additionally require domain.isVerified —
        // otherwise a merchant could type in ANY domain string (including
        // one they don't control, or one another merchant already legitimately
        // uses) and have it served here before ever proving ownership via the
        // DNS TXT challenge (see DomainVerificationService). Subdomains don't
        // need this: we control that DNS zone ourselves.
        const store = await Store.findOne({
            status: 'live',
            $or: [
                { 'domain.subdomain': subdomain },
                { 'domain.customDomain': subdomain, 'domain.isVerified': true }
            ]
        })
            // .lean() bypasses Mongoose document hydration (huge performance
            // win for a read-heavy public endpoint), but it also bypasses
            // EmailSenderSchema's toJSON transform (see Store.ts), which is
            // the only thing that normally strips the SMTP password
            // ciphertext from a store response. So it's excluded explicitly
            // here at the query level instead.
            .select('-settings.emailSender.smtp.passwordEncrypted')
            .lean();

        if (!store) {
            return res.status(404).json({ message: 'Store not found or not published' });
        }

        // Cache the RAW store (heroSlider included) — gating is applied
        // fresh on every response, cached or not, see gateHeroSlider above.
        try {
            await redisClient.setex(cacheKey, 3600, JSON.stringify(store));
        } catch (redisErr) {
            console.warn(`[Redis Fallback] SET failed for ${cacheKey}`, redisErr);
        }

        res.json(await gateHeroSlider(store));
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
        const { categoryId } = req.query;

        // Category-filtered requests get their own cache key and skip the
        // unfiltered full-catalog cache entirely (kept exactly as before
        // for the common no-filter case the storefront uses today).
        const cacheKey = categoryId
            ? `products:store:${storeId}:public:list:category:${categoryId}`
            : `products:store:${storeId}:public:list`;

        let cachedData = null;
        try {
            cachedData = await redisClient.get(cacheKey);
        } catch (redisErr) {
            console.warn(`[Redis Fallback] GET failed for ${cacheKey}`, redisErr);
        }

        if (cachedData) {
            return res.json(JSON.parse(cachedData));
        }

        const filter: any = { storeId, status: 'active' };
        if (categoryId) filter.categoryId = categoryId;

        // .lean() skips Mongoose document hydration (no getters/setters/
        // change-tracking machinery for a response we're about to
        // JSON.stringify and discard) — but that also means it drops the
        // totalStock/totalReserved/totalAvailable virtuals (lean bypasses
        // the virtual system entirely; `{virtuals:true}` here is a no-op
        // without the mongoose-lean-virtuals plugin), so those are
        // recomputed manually via withStockVirtualsMany instead.
        // .select('-costPerItem') keeps the merchant's cost price out of the
        // anonymous storefront API response — same pattern as the SMTP
        // password exclusion above; `features` is intentionally NOT excluded
        // since the spec table is meant to be public.
        const rawProducts = await Product.find(filter).sort({ createdAt: -1 }).select('-costPerItem').lean();
        const products = withStockVirtualsMany(rawProducts);

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

// @desc    Get active categories for a store's storefront nav/filters
// @route   GET /api/public/stores/:storeId/categories
// @access  Public
export const getStoreCategories = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.params;
        const categories = await Category.find({ storeId, isActive: true })
            .sort({ sortOrder: 1, name: 1 })
            .select('name slug image')
            .lean();
        res.json(categories);
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

        // .select('-costPerItem') — see getStoreProducts above.
        const rawProduct = await Product.findOne({ _id: productId, status: 'active' }).select('-costPerItem').lean();

        if (!rawProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }
        const product = withStockVirtuals(rawProduct);

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
