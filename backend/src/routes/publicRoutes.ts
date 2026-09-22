import express from 'express';
import rateLimit from 'express-rate-limit';
import {
    getStoreBySubdomain,
    getStoreProducts,
    getStoreCategories,
    getProductDetails,
    trackStoreVisit,
    validateCoupon,
    getAutoApplyCoupon,
    subscribeNewsletter
} from '../controllers/publicController';
import {
    createPublicOrder,
    getPublicOrderDetails,
    trackOrder,
    getShippingFeeEstimate
} from '../controllers/publicOrderController';
import { getProductReviews, createReview } from '../controllers/reviewController';
import { handleKashierCallback } from '../controllers/webhookController';
import { storefrontBillingContext, checkServiceAvailability } from '../middleware/billingMiddleware';

const router = express.Router();

// Matches the convention used for chat/support (rateLimit declared inline
// per route file) — a review submission is a write from an unauthenticated
// shopper, so it needs the same abuse guard.
const reviewLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 5,
    message: { message: 'Too many review submissions, please try again in a minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.get('/stores/:subdomain', getStoreBySubdomain);
router.get('/stores/:storeId/products', getStoreProducts);
router.get('/stores/:storeId/categories', getStoreCategories);
router.post('/stores/:storeId/visit', trackStoreVisit);
router.get('/products/:productId', getProductDetails);
router.get('/products/:productId/reviews', getProductReviews);
router.post('/products/:productId/reviews', reviewLimiter, createReview);
router.get('/stores/:storeId/shipping-fee', getShippingFeeEstimate);
router.get('/stores/:storeId/coupons/validate', validateCoupon);
router.get('/stores/:storeId/coupons/auto-apply', getAutoApplyCoupon);
router.post('/stores/:storeId/newsletter/subscribe', subscribeNewsletter);

router.post('/orders', storefrontBillingContext, checkServiceAvailability, createPublicOrder);
router.get('/orders/track/:orderNumber', trackOrder);
router.get('/orders/:orderId', getPublicOrderDetails);

// Public — Kashier can't send our merchant JWT, so this is authenticated
// instead by Kashier's own redirect signature (handleKashierCallback checks
// it via PaymentFactory.getProvider(store).validateWebhookPayload(...)),
// the same pattern as /api/shipping/webhook/:provider/:storeId and
// /api/billing/webhook/paymob. This is the exact URL
// KashierPaymentService.initializePayment builds as `merchantRedirect`.
router.get('/payments/kashier/callback/:storeId', handleKashierCallback);

export default router;
