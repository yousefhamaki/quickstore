import express from 'express';
import {
    getStoreBySubdomain,
    getStoreProducts,
    getProductDetails,
    trackStoreVisit
} from '../controllers/publicController';
import {
    createPublicOrder,
    getPublicOrderDetails,
    trackOrder
} from '../controllers/publicOrderController';
import { storefrontBillingContext, checkServiceAvailability } from '../middleware/billingMiddleware';

const router = express.Router();

router.get('/stores/:subdomain', getStoreBySubdomain);
router.get('/stores/:storeId/products', getStoreProducts);
router.post('/stores/:storeId/visit', trackStoreVisit);
router.get('/products/:productId', getProductDetails);

router.post('/orders', storefrontBillingContext, checkServiceAvailability, createPublicOrder);
router.get('/orders/track/:orderNumber', trackOrder);
router.get('/orders/:orderId', getPublicOrderDetails);

export default router;
