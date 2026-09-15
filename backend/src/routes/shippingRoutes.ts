import express from 'express';
import { protect } from '../middleware/authMiddleware';
import { generateWaybill, trackShipment, setManualTracking } from '../controllers/shippingController';

const router = express.Router();

router.use(protect);

router.post('/waybill/:orderId', generateWaybill);
router.get('/track/:orderId', trackShipment);
router.put('/orders/:orderId/tracking', setManualTracking);

export default router;
