import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { generateWaybill, trackShipment, setManualTracking } from '../controllers/shippingController';
import { handleShippingWebhook } from '../controllers/webhookController';

const router = express.Router();

// Public — external couriers (Bosta, etc.) can't send our merchant JWT, so
// this is authenticated instead by the provider's own signature header
// (handleShippingWebhook checks x-bosta-signature via
// ShippingFactory.getProvider(store).validateWebhookPayload(...)), the same
// pattern as POST /api/billing/webhook/paymob in billingRoutes.ts. Must be
// registered before `router.use(protect)` below, or every webhook delivery
// would 401 on the JWT check before ever reaching the handler. No raw-body
// exception needed here (unlike some HMAC schemes) — BostaShippingService's
// validateWebhookPayload signs `JSON.stringify(req.body)` post-parse, same
// as Paymob's handler.
router.post('/webhook/:provider/:storeId', handleShippingWebhook);

router.use(protect);

router.post('/waybill/:orderId', generateWaybill);
router.get('/track/:orderId', trackShipment);
router.put('/orders/:orderId/tracking', setManualTracking);

export default router;
