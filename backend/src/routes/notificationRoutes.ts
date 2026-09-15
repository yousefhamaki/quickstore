import express from 'express';
import { protect } from '../middleware/authMiddleware';
import {
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
} from '../controllers/notificationController';

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/mark-all-read', markAllNotificationsRead);
router.put('/:id/read', markNotificationRead);

export default router;
