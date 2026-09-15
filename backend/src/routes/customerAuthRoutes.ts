import express from 'express';
import rateLimit from 'express-rate-limit';
import {
    registerCustomer,
    loginCustomer,
    getMe,
    updateMe,
    changePassword,
    forgotPassword,
    resetPassword,
    addAddress,
    updateAddress,
    deleteAddress,
    listMyOrders,
    getMyOrderById
} from '../controllers/customerAuthController';
import { createRefundRequest, getMyRefundRequests } from '../controllers/refundRequestController';
import { protectCustomer } from '../middleware/customerAuthMiddleware';
import { upload } from '../config/cloudinary';

const router = express.Router({ mergeParams: true });

// Matches the convention used elsewhere for unauthenticated writes from
// shoppers (see publicRoutes.ts's reviewLimiter) — register/login are the
// obvious brute-force/credential-stuffing/account-enumeration targets here.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Too many attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// All routes are nested under /api/account/:storeId — storeId is embedded
// in the customer's own JWT and re-checked against it on every protected
// request (see customerAuthMiddleware.protectCustomer).
router.post('/:storeId/register', authLimiter, registerCustomer);
router.post('/:storeId/login', authLimiter, loginCustomer);
router.post('/:storeId/forgot-password', authLimiter, forgotPassword);
router.post('/:storeId/reset-password', authLimiter, resetPassword);

router.get('/:storeId/me', protectCustomer, getMe);
router.put('/:storeId/me', protectCustomer, updateMe);
router.put('/:storeId/me/password', protectCustomer, changePassword);

router.post('/:storeId/addresses', protectCustomer, addAddress);
router.put('/:storeId/addresses/:addressId', protectCustomer, updateAddress);
router.delete('/:storeId/addresses/:addressId', protectCustomer, deleteAddress);

router.get('/:storeId/orders', protectCustomer, listMyOrders);
router.get('/:storeId/orders/:orderId', protectCustomer, getMyOrderById);

router.post('/:storeId/orders/:orderId/refund-requests', protectCustomer, createRefundRequest);
router.get('/:storeId/refund-requests', protectCustomer, getMyRefundRequests);

// Single-photo upload for refund-request evidence (e.g. a damaged item).
// Reuses the same multer-Cloudinary middleware as merchant product image
// uploads (see config/cloudinary.ts / productRoutes.ts), just customer-auth
// gated instead of merchant-gated.
router.post('/:storeId/upload', protectCustomer, upload.single('photo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    res.json({ url: (req.file as any).path, publicId: (req.file as any).filename });
});

export default router;
