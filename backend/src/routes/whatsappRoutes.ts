import express from 'express';
import { connectWhatsApp, getWhatsAppStatus, disconnectWhatsApp, getWhatsAppAccountBalance } from '../controllers/whatsappController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);
router.use(authorize('merchant'));

router.post('/:id/whatsapp/connect', connectWhatsApp);
router.get('/:id/whatsapp/status', getWhatsAppStatus);
router.post('/:id/whatsapp/disconnect', disconnectWhatsApp);
router.get('/:id/whatsapp/account', getWhatsAppAccountBalance);

export default router;
