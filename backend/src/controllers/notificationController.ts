import { Response } from 'express';
import Notification from '../models/Notification';
import DeviceToken from '../models/DeviceToken';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Paginated list of this merchant's notifications, plus their unread count
// @route   GET /api/notifications?page=1&limit=20
// @access  Private
export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

        const [entries, total, unreadCount] = await Promise.all([
            Notification.find({ userId: req.user._id })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            Notification.countDocuments({ userId: req.user._id }),
            Notification.countDocuments({ userId: req.user._id, isRead: false }),
        ]);

        res.json({ entries, unreadCount, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        console.error('[NotificationController] getNotifications failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Just the unread count — cheap enough to poll frequently for the bell badge
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
    try {
        const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
        res.json({ unreadCount });
    } catch (error) {
        console.error('[NotificationController] getUnreadCount failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark one notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markNotificationRead = async (req: AuthRequest, res: Response) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { $set: { isRead: true } },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json(notification);
    } catch (error) {
        console.error('[NotificationController] markNotificationRead failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Mark every one of this merchant's notifications as read
// @route   PUT /api/notifications/mark-all-read
// @access  Private
export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
    try {
        await Notification.updateMany({ userId: req.user._id, isRead: false }, { $set: { isRead: true } });
        res.json({ message: 'All notifications marked as read.' });
    } catch (error) {
        console.error('[NotificationController] markAllNotificationsRead failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Register (or re-register) this device for push notifications —
//          called by the mobile-merchant app right after a successful
//          login. Upserts on expoPushToken so re-registering the same
//          device (e.g. re-opening the app) just refreshes ownership/lastSeenAt
//          instead of accumulating duplicate rows.
// @route   POST /api/notifications/register-device
// @access  Private
export const registerDevice = async (req: AuthRequest, res: Response) => {
    const { expoPushToken, platform } = req.body;

    if (!expoPushToken || typeof expoPushToken !== 'string') {
        return res.status(400).json({ message: 'expoPushToken is required.' });
    }
    if (platform !== 'ios' && platform !== 'android') {
        return res.status(400).json({ message: "platform must be 'ios' or 'android'." });
    }

    try {
        await DeviceToken.findOneAndUpdate(
            { expoPushToken },
            { $set: { userId: req.user._id, platform, lastSeenAt: new Date() } },
            { upsert: true, setDefaultsOnInsert: true }
        );
        res.json({ message: 'Device registered.' });
    } catch (error) {
        console.error('[NotificationController] registerDevice failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Unregister this device (called on logout, so a signed-out device
//          stops receiving pushes for the account it just left).
// @route   POST /api/notifications/unregister-device
// @access  Private
export const unregisterDevice = async (req: AuthRequest, res: Response) => {
    const { expoPushToken } = req.body;

    if (!expoPushToken || typeof expoPushToken !== 'string') {
        return res.status(400).json({ message: 'expoPushToken is required.' });
    }

    try {
        await DeviceToken.deleteOne({ expoPushToken, userId: req.user._id });
        res.json({ message: 'Device unregistered.' });
    } catch (error) {
        console.error('[NotificationController] unregisterDevice failed:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
