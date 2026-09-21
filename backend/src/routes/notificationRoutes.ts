import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    registerDevice,
    unregisterDevice,
} from '../controllers/notificationController';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/mark-all-read', markAllNotificationsRead);
router.put('/:id/read', markNotificationRead);
router.post('/register-device', registerDevice);
router.post('/unregister-device', unregisterDevice);

export default router;
